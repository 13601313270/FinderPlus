import { StringValue } from '../../engine/data/StringValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { MultiModalValue, wrapAsMultiModal, type MultiModalPart } from '../../engine/data/MultiModalValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import type { Value } from '../../engine/data/Value'
import type { InputPortChangeSource } from '../../engine/node/Node'
import type { RawChatResponse, ChatMessage } from '../LLMNode/node'

/** HarnessNode 内部使用的 message 格式 */
export interface HarnessMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | Array<{
    type: string;
    [k: string]: unknown
  }>
  tool_calls?: ToolCallRecord[]
  tool_call_id?: string
  name?: string
}

export interface ToolCallRecord {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

/** Tool 的 JSON Schema 描述（传给 LLM 的 function calling） */
export interface ToolSchema {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

/** Tool 的统一接口 */
export interface HarnessTool {
  readonly schema: ToolSchema
  execute(args: Record<string, unknown>): Promise<string>
}

/** Canvas 节点绑定的 Tool 元数据（用于 saveState 持久化） */
export interface CanvasToolBinding {
  nodeId: string
  toolName: string
  description: string
  inputMapping: Record<string, string> // tool 参数名 → 节点输入端口 id
  outputPortId: string
}

/** ask_user 工具的请求参数（HarnessLoop → UI） */
export interface UserPromptRequest {
  question: string
  options: string[]
  multiple?: boolean
}

/** ask_user 工具的用户响应（UI → HarnessLoop） */
export interface UserPromptResponse {
  answer: string | string[]
  cancelled?: boolean
}

/** 挂起中的 ask_user 记录（HarnessNode → UI 展示） */
export interface PendingUserPrompt extends UserPromptRequest {
  /** 内部 handle，用于 resolve 时回调 */
  handle: string
}

/** 内置工具：纯 JS 函数实现 */
class BuiltinTool implements HarnessTool {
  constructor(
    readonly schema: ToolSchema,
    private fn: (args: Record<string, unknown>) => Promise<string> | string,
    readonly sourceCode: string = ''
  ) {
  }
  async execute(args: Record<string, unknown>): Promise<string> {
    // console.log('BuiltinTool execute', args)
    const result = await this.fn(args)
    return typeof result === 'string' ? result : JSON.stringify(result)
  }
}

/** UI 专用的内置工具详情（schema + 源码），不发给 LLM */
export interface BuiltinToolInfo {
  schema: ToolSchema
  sourceCode: string
  /** 工具来源：builtin 代码写死 / dynamic LLM 运行时 define_tool */
  kind: 'builtin' | 'dynamic'
}

/** Canvas 节点绑定的 Tool：commit → wait → read output */
class CanvasNodeTool implements HarnessTool {
  constructor(
    readonly binding: CanvasToolBinding,
    private _node: Node | null // null 表示节点已被删除或尚未恢复
  ) {
  }

  /** 恢复/更新底层节点引用（adoptAllChildren 时从 scene 拿到真实实例后调） */
  setNode(node: Node | null): void {
    this._node = node
  }

  get node(): Node | null {
    return this._node
  }

  get schema(): ToolSchema {
    const node = this.node
    if (!node) {
      return {
        type: 'function',
        function: {
          name: this.binding.toolName,
          description: `(节点已删除) ${this.binding.description}`,
          parameters: { type: 'object', properties: {} }
        }
      }
    }

    const properties: Record<string, unknown> = {}
    const required: string[] = []
    for (const [argName, portId] of Object.entries(this.binding.inputMapping)) {
      const port = node.inputPorts.find(p => p.id === portId)
      if (!port) continue
      const typeInfo = valueClassToJsonSchema(port.acceptValueNames)
      properties[argName] = {
        type: typeInfo.type,
        description: (port.label as any)?.zh ?? portId
      }
      required.push(argName)
    }

    return {
      type: 'function',
      function: {
        name: this.binding.toolName,
        description: this.binding.description,
        parameters: { type: 'object', properties, required }
      }
    }
  }

  /** 刷新节点引用（画布恢复后节点才会出现在 scene 里） */
  refreshNodeRef(): void {
    this.setNode(workspaceScene.getNode(this.binding.nodeId) ?? null)
  }

  get isNodeAlive(): boolean {
    return this.node !== null
  }

  async execute(args: Record<string, unknown>): Promise<string> {
    const node = this.node
    if (!node) {
      return JSON.stringify({ error: `绑定的节点 ${this.binding.nodeId} 已被删除` })
    }

    // Step 1: 把 args 逐 commit 到节点的输入端口
    for (const [argName, portId] of Object.entries(this.binding.inputMapping)) {
      const port = node.inputPorts.find(p => p.id === portId)
      if (!port) continue
      const value = wrapArgValue(args[argName], port.acceptValueNames)
      port.lastReceiveValue = value
      node._onInputPortChanged([port], 'receive' as InputPortChangeSource)
    }

    // Step 2: 如果节点有 sendPort（手动触发型），调 sendPort.trigger()
    const sendPort = node.methodPorts.find(m => m.id === 'send')
    if (sendPort && typeof (sendPort as any).trigger === 'function') {
      (sendPort as any).trigger()
    }

    // Step 3: 等输出端口出值（最可靠的信号）或 state 变完成态（兜底）
    const outPort = node.outputPorts.find(p => p.id === this.binding.outputPortId)
    try {
      await waitForPortCommit(node, outPort)
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
    }

    // Step 4: 从输出端口读值
    const output = node.outputPorts.find(p => p.id === this.binding.outputPortId)
    if (!output) {
      const firstWithValue = node.outputPorts.find(p => (p as any).currentValue !== undefined)
      if (!firstWithValue) {
        return JSON.stringify({ error: '节点没有输出' })
      }
      return formatValueAsText((firstWithValue as any).currentValue)
    }
    const currentValue = (output as any).currentValue as Value | undefined
    if (!currentValue) {
      return JSON.stringify({ error: '节点输出为空' })
    }
    return formatValueAsText(currentValue)
  }
}

/** Tool 注册表：内置工具 + Canvas 节点工具 + LLM 动态工具统一管理 */
class ToolRegistry {
  /** 代码写死的内置工具（json_parse 等 + define_tool / remove_tool / ask_user）—— LLM 实际可见的 */
  private builtin = new Map<string, HarnessTool>()
  /** 所有内置工具本体模板（注册时暂存，toggleBuiltin 用来挂/摘） */
  private builtinTemplates = new Map<string, HarnessTool>()
  /** LLM 通过 define_tool 在运行时加的动态工具 */
  dynamic = new Map<string, HarnessTool>()
  /** Canvas 节点绑定的工具 */
  private canvas = new Map<string, CanvasNodeTool>()

  /** 动态工具增删时的变更回调，HarnessNode 挂载 notifyChanged 用来实时刷新 UI */
  onChange: (() => void) | null = null

  /** ask_user 工具挂起时的回调，HarnessNode 用来暂停 loop 并展示选项弹窗 */
  userPromptHandler: ((req: UserPromptRequest) => Promise<UserPromptResponse>) | null = null

  /** 注册内置工具：放入 builtinTemplates（本体）+ builtin（默认激活） */
  registerBuiltin(tool: HarnessTool): void {
    const name = tool.schema.function.name
    this.builtinTemplates.set(name, tool)
    this.builtin.set(name, tool)
  }

  /** 批量控制内置工具的激活状态：enabled=true 放回 builtin；enabled=false 从 builtin 里摘掉，LLM 不可见 */
  setBuiltinsEnabled(names: string[], enabled: boolean): void {
    for (const name of names) {
      const tpl = this.builtinTemplates.get(name)
      if (!tpl) continue
      if (enabled) {
        this.builtin.set(name, tpl)
      } else {
        this.builtin.delete(name)
      }
    }
    this.onChange?.()
  }

  /** 查询某个内置工具是否激活（在 builtin 里） */
  isBuiltinEnabled(name: string): boolean {
    return this.builtin.has(name)
  }

  /** 返回所有内置工具模板的名字（不论是否激活） */
  getBuiltinNames(): string[] {
    return Array.from(this.builtinTemplates.keys())
  }

  registerDynamic(tool: HarnessTool): void {
    this.dynamic.set(tool.schema.function.name, tool)
    this.onChange?.()
  }

  deleteDynamic(name: string): boolean {
    const ok = this.dynamic.delete(name)
    if (ok) this.onChange?.()
    return ok
  }

  bindNode(binding: CanvasToolBinding): CanvasNodeTool {
    const node = workspaceScene.getNode(binding.nodeId) ?? null
    const tool = new CanvasNodeTool(binding, node)
    this.canvas.set(binding.toolName, tool)
    return tool
  }

  removeCanvasTool(toolName: string): void {
    this.canvas.delete(toolName)
  }

  removeCanvasToolByNodeId(nodeId: string): void {
    for (const [toolName, tool] of this.canvas) {
      if (tool.binding.nodeId === nodeId) {
        this.canvas.delete(toolName)
        return
      }
    }
  }

  /** 画布恢复后，批量把 scene 里的真实节点实例回填到 CanvasNodeTool._node */
  refreshAllCanvasToolNodes(): void {
    for (const tool of this.canvas.values()) {
      tool.refreshNodeRef()
    }
  }

  /** 更新 Canvas 节点绑定的元数据（toolName / description）。toolName 变了要重新建 key。 */
  updateBinding(oldToolName: string, patch: Partial<Pick<CanvasToolBinding, 'toolName' | 'description'>>): void {
    const existing = this.canvas.get(oldToolName)
    if (!existing) return
    const oldBinding = existing['binding']

    const newToolName = patch.toolName ?? oldBinding.toolName
    const newBinding: CanvasToolBinding = {
      ...oldBinding,
      toolName: newToolName,
      description: patch.description ?? oldBinding.description
    }

    this.canvas.delete(oldToolName)
    const node = workspaceScene.getNode(oldBinding.nodeId) ?? null
    this.canvas.set(newToolName, new CanvasNodeTool(newBinding, node))
  }

  /** 画布恢复后刷新所有 CanvasNodeTool 的节点引用 */
  refreshAllNodeRefs(): void {
    for (const tool of this.canvas.values()) {
      tool.refreshNodeRef()
    }
  }

  /** 获取所有有效的 Tool（跳过节点已删除的） */
  getValidTools(): HarnessTool[] {
    const result: HarnessTool[] = []
    for (const t of this.builtin.values()) result.push(t)
    for (const t of this.dynamic.values()) result.push(t)
    for (const t of this.canvas.values()) {
      if (t.isNodeAlive) result.push(t)
    }
    return result
  }

  getToolSchemas(): ToolSchema[] {
    return this.getValidTools().map(t => t.schema)
  }

  /** 仅内置工具 schema（json_parse 等 + define_tool / remove_tool） */
  getBuiltinSchemas(): ToolSchema[] {
    return Array.from(this.builtin.values()).map(t => t.schema)
  }

  /** 内置工具详情列表（schema + 源码），供 UI 展示 */
  getBuiltinInfos(): BuiltinToolInfo[] {
    return Array.from(this.builtin.values()).map(t => ({
      schema: t.schema,
      sourceCode: (t as BuiltinTool).sourceCode ?? '',
      kind: 'builtin' as const
    }))
  }

  /** 所有工具详情列表（内置 + LLM 动态注册），供 UI 展示 */
  getAllToolInfos(): BuiltinToolInfo[] {
    const result: BuiltinToolInfo[] = []
    for (const t of this.builtin.values()) {
      result.push({ schema: t.schema, sourceCode: (t as BuiltinTool).sourceCode ?? '', kind: 'builtin' as const })
    }
    for (const t of this.dynamic.values()) {
      result.push({ schema: t.schema, sourceCode: (t as BuiltinTool).sourceCode ?? '', kind: 'dynamic' as const })
    }
    return result
  }

  async execute(name: string, args: Record<string, unknown>): Promise<string> {
    const tool = this.builtin.get(name) ?? this.dynamic.get(name) ?? this.canvas.get(name)
    if (!tool) {
      return JSON.stringify({ error: `工具未找到: ${name}` })
    }
    const result = await tool.execute(args);
    console.log('函数工具被执行，ToolRegistry execute', name, args, result)
    return result;
  }

  getAllCanvasBindings(): CanvasToolBinding[] {
    return Array.from(this.canvas.values()).map(t => t['binding'])
  }

  getAllBindings(): CanvasToolBinding[] {
    return Array.from(this.canvas.values()).map(t => t['binding'])
  }
}

/** ReAct 消息循环 */

/** 把 MultiModalValue 转成 OpenAI 兼容的 user message content */
async function buildUserContent(
  mm: MultiModalValue
): Promise<string | Array<{
  type: string;
  [k: string]: unknown
}>> {
  if (mm.isNull || mm.parts.length === 0) return ''

  // 只有纯文本 → content 直接 string
  if (mm.parts.every(p => p.type === 'text')) {
    return mm.parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text).join('\n')
  }

  // 有图片 → content 是 array
  const content: Array<{
    type: string;
    [k: string]: unknown
  }> = []
  for (const part of mm.parts) {
    if (part.type === 'text') {
      content.push({ type: 'text', text: part.text })
    } else if (part.type === 'image') {
      const dataUrl = await fileToDataURL(part.file)
      content.push({ type: 'image_url', image_url: { url: dataUrl } })
    }
  }
  return content
}

/** File → data URL */
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** 从 content（string 或 array）里提取纯文本 */
function extractTextContent(
  content: string | Array<{
    type: string;
    [k: string]: unknown
  }> | undefined
): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  return content
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map(p => p.text)
    .join('\n')
}

class HarnessLoop {
  messages: HarnessMessage[] = []
  private iteration = 0
  private aborted = false
  private llmNode: Node | null = null

  constructor(
    private toolRegistry: ToolRegistry,
    private maxIterations: number
  ) {
  }

  setModelNode(node: Node | null): void {
    this.llmNode = node
  }

  get isModelReady(): boolean {
    return this.llmNode !== null && typeof (this.llmNode as any).chat === 'function'
  }

  /** 外部 abort */
  abort(): void {
    this.aborted = true
  }

  async run(system: string, promptMm: MultiModalValue): Promise<string> {
    this.messages = [
      { role: 'system', content: system || 'You are a helpful assistant. Use tools when needed.' },
      { role: 'user', content: await buildUserContent(promptMm) }
    ]
    this.iteration = 0
    this.aborted = false

    while (this.iteration < this.maxIterations) {
      if (this.aborted) throw new Error('aborted')
      this.iteration++

      // Step 1: 调 LLM
      const llmNode = this.llmNode as any
      if (!llmNode || typeof llmNode.chat !== 'function') {
        throw new Error('未绑定 LLM 节点')
      }

      let raw: RawChatResponse
      try {
        raw = await llmNode.chat(
          this.messages.map(m => {
            const out: ChatMessage = { role: m.role as any, content: m.content }
            if (m.tool_calls && m.tool_calls.length > 0) {
              out.tool_calls = m.tool_calls
            }
            if (m.role === 'tool') {
              out.tool_call_id = m.tool_call_id
              out.name = m.name
            }
            return out
          }),
          this.toolRegistry.getToolSchemas()
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.messages.push({ role: 'assistant', content: `[LLM 调用失败: ${msg}]` })
        throw err
      }

      // Step 2: 追加 assistant 消息
      const assistantMsg: HarnessMessage = {
        role: 'assistant',
        content: raw.content ?? ''
      }
      if (raw.tool_calls && raw.tool_calls.length > 0) {
        assistantMsg.tool_calls = raw.tool_calls as ToolCallRecord[]
      }
      this.messages.push(assistantMsg)

      // Step 3: 没有 tool_calls → Loop 结束
      if (!raw.tool_calls || raw.tool_calls.length === 0) {
        return raw.content ?? ''
      }

      // Step 4: 顺序执行所有 tool_calls
      const toolResults: HarnessMessage[] = []
      for (const call of raw.tool_calls) {
        const result = await this.executeOneTool(call)
        toolResults.push(result)
      }
      this.messages.push(...toolResults)
    }

    // 超过 maxIterations → 返回最后一条 assistant 消息
    const lastAssistant = [...this.messages].reverse().find(m => m.role === 'assistant')
    return extractTextContent(lastAssistant?.content)
  }

  private async executeOneTool(call: ToolCallRecord): Promise<HarnessMessage> {
    let resultText: string
    try {
      const args = JSON.parse(call.function.arguments || '{}')
      resultText = await this.toolRegistry.execute(call.function.name, args)
    } catch (err) {
      resultText = JSON.stringify({
        error: err instanceof Error ? err.message : String(err)
      })
    }
    return {
      role: 'tool',
      tool_call_id: call.id,
      name: call.function.name,
      content: resultText
    }
  }
}

// ─── 辅助函数 ───

/**
 * 等待一个节点的 outputPort 产出值（commit）。
 * 信号 1（主）：outputPort.onCommit → 端口一 commit 值就 resolve
 * 信号 2（兜底）：node.onChanged → state 变 stable/error 也 resolve
 * 为什么不单纯等 state？很多自动处理型节点不会自动调 completeRun，
 * commit 了 outputPort 就跑完了，但 state 还在 dirty。
 */
function waitForPortCommit(node: Node, outputPort: OutputPort | undefined): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    let portListener: (() => void) | null = null
    let nodeUnsub: (() => void) | null = null

    function cleanup() {
      if (settled) return
      settled = true
      if (outputPort && portListener) outputPort.offCommit(portListener)
      nodeUnsub?.()
    }

    // 信号 1：outputPort commit（最可靠）
    // 注意：不做"端口已有值就直接 resolve"的快捷路径——同一个节点被多次调用时，
    // 上一次 commit 的值还在端口上，直接 resolve 会拿到旧值，必须等本次新的 commit 事件
    if (outputPort) {
      portListener = () => {
        cleanup()
        resolve()
      }
      outputPort.onCommit(portListener)
    }

    // 信号 2（兜底）：node state 变成完成态
    nodeUnsub = node.onChanged(() => {
      if (node.state === 'stable' || node.state === 'error') {
        cleanup()
        resolve()
      }
    })
  })
}

/** Canvas 节点的 acceptValueNames → JSON Schema type */
function valueClassToJsonSchema(acceptNames: readonly string[]): { type: string } {
  const first = acceptNames[0]
  switch (first) {
    case 'number': return { type: 'number' }
    case 'bool': return { type: 'boolean' }
    case 'json': return { type: 'object' }
    default: return { type: 'string' }
  }
}

/** JS args → Canvas Value 实例（通过 acceptValueNames 类型名判定） */
function wrapArgValue(arg: unknown, acceptNames: readonly string[]): Value {
  const first = acceptNames[0]
  if (first === 'number') return new NumberValue(typeof arg === 'number' ? arg : Number(arg))
  if (first === 'bool') return new BoolValue(Boolean(arg))
  if (first === 'json') {
    const obj = typeof arg === 'string' ? JSON.parse(arg) : arg
    return new JsonValue(obj)
  }
  // 默认 StringValue
  return new StringValue(typeof arg === 'string' ? arg : JSON.stringify(arg))
}

/** 把 Canvas Value 实例格式化成文本 tool result */
function formatValueAsText(value: Value): string {
  if (value.isNull) return '(null)'
  if (value instanceof StringValue) return value.value ?? ''
  if (value instanceof JsonValue) return JSON.stringify(value.value ?? null)
  if (value instanceof NumberValue) return String(value.value ?? 0)
  if (value instanceof BoolValue) return String(value.value ?? false)
  // FileValue 等：用 displayLabel（通常是文件名）
  return value.displayLabel
}

// 需要引入的 Value 类（上面 wrapArgValue 用到了）
import { NumberValue } from '../../engine/data/NumberValue'
import { BoolValue } from '../../engine/data/BoolValue'

/** 内置工具注册：5 个最基础的 JS 函数工具 */
function registerBuiltinTools(registry: ToolRegistry): void {
  // 1. JSON 解析 / 校验
  registry.registerBuiltin(new BuiltinTool(
    {
      type: 'function',
      function: {
        name: 'json_parse',
        description: '解析 JSON 字符串，返回解析后的对象；不是合法 JSON 则返回错误',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: '要解析的 JSON 字符串' }
          },
          required: ['text']
        }
      }
    },
    async (args) => {
      try {
        return JSON.stringify(JSON.parse(String(args.text ?? '')), null, 2)
      } catch (e) {
        return JSON.stringify({ error: `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}` })
      }
    },
    `async (args) => {
  try {
    return JSON.stringify(JSON.parse(String(args.text ?? '')), null, 2)
  } catch (e) {
    return JSON.stringify({ error: \`JSON 解析失败: \${e instanceof Error ? e.message : String(e)}\` })
  }
}`
  ))

  // 2. JSON 取值（用 key 路径）
  registry.registerBuiltin(new BuiltinTool(
    {
      type: 'function',
      function: {
        name: 'json_get',
        description: '从 JSON 对象中按 key 取值。支持点号嵌套如 "data.items.0.name"',
        parameters: {
          type: 'object',
          properties: {
            json_str: { type: 'string', description: 'JSON 字符串' },
            path: { type: 'string', description: '取值路径，如 "user.name" 或 "items.0.id"' }
          },
          required: ['json_str', 'path']
        }
      }
    },
    async (args) => {
      try {
        const obj = JSON.parse(String(args.json_str ?? 'null'))
        const parts = String(args.path ?? '').split('.').filter(p => p !== '')
        let cur: any = obj
        for (const part of parts) {
          if (cur === null || cur === undefined) return 'null'
          cur = cur[part]
        }
        if (typeof cur === 'object') return JSON.stringify(cur, null, 2)
        return String(cur)
      } catch (e) {
        return JSON.stringify({ error: `取值失败: ${e instanceof Error ? e.message : String(e)}` })
      }
    },
    `async (args) => {
  try {
    const obj = JSON.parse(String(args.json_str ?? 'null'))
    const parts = String(args.path ?? '').split('.').filter(p => p !== '')
    let cur = obj
    for (const part of parts) {
      if (cur === null || cur === undefined) return 'null'
      cur = cur[part]
    }
    if (typeof cur === 'object') return JSON.stringify(cur, null, 2)
    return String(cur)
  } catch (e) {
    return JSON.stringify({ error: \`取值失败: \${e instanceof Error ? e.message : String(e)}\` })
  }
}`
  ))

  // 3. 正则提取
  registry.registerBuiltin(new BuiltinTool(
    {
      type: 'function',
      function: {
        name: 'regex_extract',
        description: '用正则表达式从文本中提取匹配内容。返回第一个捕获组或整个匹配',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: '要搜索的文本' },
            pattern: { type: 'string', description: '正则表达式，如 "<title>(.*?)</title>"' },
            flags: { type: 'string', description: '正则 flags，默认空；可传 "g" "i" 等' }
          },
          required: ['text', 'pattern']
        }
      }
    },
    async (args) => {
      try {
        const regex = new RegExp(String(args.pattern), String(args.flags ?? ''))
        const matches: string[] = []
        let m: RegExpExecArray | null
        const text = String(args.text ?? '')
        while ((m = regex.exec(text)) !== null) {
          matches.push(m[1] ?? m[0])
          if (!regex.global) break
          if (m.index === regex.lastIndex) regex.lastIndex++
        }
        if (matches.length === 0) return '(no match)'
        if (matches.length === 1) return matches[0]
        return JSON.stringify(matches)
      } catch (e) {
        return JSON.stringify({ error: `正则执行失败: ${e instanceof Error ? e.message : String(e)}` })
      }
    },
    `async (args) => {
  try {
    const regex = new RegExp(String(args.pattern), String(args.flags ?? ''))
    const matches = []
    let m
    const text = String(args.text ?? '')
    while ((m = regex.exec(text)) !== null) {
      matches.push(m[1] ?? m[0])
      if (!regex.global) break
      if (m.index === regex.lastIndex) regex.lastIndex++
    }
    if (matches.length === 0) return '(no match)'
    if (matches.length === 1) return matches[0]
    return JSON.stringify(matches)
  } catch (e) {
    return JSON.stringify({ error: \`正则执行失败: \${e instanceof Error ? e.message : String(e)}\` })
  }
}`
  ))

  // 4. URL 编码 / 解码
  registry.registerBuiltin(new BuiltinTool(
    {
      type: 'function',
      function: {
        name: 'url_encode',
        description: '对字符串做 URL encode/decode',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: '要编码或解码的字符串' },
            mode: { type: 'string', description: '"encode" 或 "decode"，默认 encode' }
          },
          required: ['text']
        }
      }
    },
    async (args) => {
      const text = String(args.text ?? '')
      const mode = String(args.mode ?? 'encode')
      return mode === 'decode' ? decodeURIComponent(text) : encodeURIComponent(text)
    },
    `async (args) => {
  const text = String(args.text ?? '')
  const mode = String(args.mode ?? 'encode')
  return mode === 'decode' ? decodeURIComponent(text) : encodeURIComponent(text)
}`
  ))

  // 5. 字符串替换
  registry.registerBuiltin(new BuiltinTool(
    {
      type: 'function',
      function: {
        name: 'string_replace',
        description: '在文本中把某个子串或正则匹配替换成新内容',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: '原始文本' },
            pattern: { type: 'string', description: '要查找的字符串或正则 pattern' },
            replacement: { type: 'string', description: '替换内容' },
            use_regex: { type: 'boolean', description: 'pattern 是否作为正则解析，默认 false' }
          },
          required: ['text', 'pattern', 'replacement']
        }
      }
    },
    async (args) => {
      const text = String(args.text ?? '')
      const pattern = String(args.pattern ?? '')
      const replacement = String(args.replacement ?? '')
      if (args.use_regex) {
        try {
          const re = new RegExp(pattern, 'g')
          return text.replace(re, replacement)
        } catch {
          return text.split(pattern).join(replacement)
        }
      }
      return text.split(pattern).join(replacement)
    },
    `async (args) => {
  const text = String(args.text ?? '')
  const pattern = String(args.pattern ?? '')
  const replacement = String(args.replacement ?? '')
  if (args.use_regex) {
    try {
      const re = new RegExp(pattern, 'g')
      return text.replace(re, replacement)
    } catch {
      return text.split(pattern).join(replacement)
    }
  }
  return text.split(pattern).join(replacement)
}`
  ))

  // 6. 动态注册工具 —— LLM 运行时根据需要自己加函数
  registry.registerBuiltin(new BuiltinTool(
    {
      type: 'function',
      function: {
        name: 'define_tool',
        description:
          '运行时动态注册一个新工具。LLM 可以根据当前任务的需要，自己定义小工具（数据清洗、格式转换、条件过滤等）。' +
          '参数 code 是一段 JavaScript 函数体，可用内建：Math / JSON / String / Array / Object / Date / RegExp / parseInt / parseFloat / isNaN / isFinite。' +
          '函数会收到一个 args 对象，需要 return 一个字符串。',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '工具名，必须全局唯一（已有则覆盖）' },
            description: { type: 'string', description: '告诉 LLM 这个工具能干啥' },
            parameters: {
              type: 'object',
              description: 'JSON Schema，定义工具的参数。如 { "type":"object", "properties":{ "text":{ "type":"string" } }, "required":["text"] }'
            },
            code: {
              type: 'string',
              description:
                'JavaScript 函数体（不是完整函数）。会被包成 `async (args) => { <code> }`。用 return 输出结果（必须是字符串，或会被 JSON.stringify）。'
            }
          },
          required: ['name', 'description', 'parameters', 'code']
        }
      }
    },
    async (args) => {
      const name = String(args.name ?? '').trim()
      const description = String(args.description ?? '').trim()
      const code = String(args.code ?? '')
      const parameters = args.parameters

      if (!name) return JSON.stringify({ error: 'name 不能为空' })
      if (!code.trim()) return JSON.stringify({ error: 'code 不能为空' })

      // 组装 ToolSchema.parameters
      let paramsSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] } = {
        type: 'object',
        properties: {}
      }
      if (parameters && typeof parameters === 'object') {
        const p = parameters as Record<string, unknown>
        paramsSchema = {
          type: 'object',
          properties: (p.properties as Record<string, unknown>) ?? {},
          required: Array.isArray(p.required) ? (p.required as string[]) : undefined
        }
      }

      // 沙箱执行：new Function + try/catch
      let runner: (a: Record<string, unknown>) => Promise<string>
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function(
          'args',
          `'use strict'; return (async function(){ ${code} })()`
        )
        runner = async (a) => {
          let result: unknown
          try {
            result = await fn(a)
          } catch (e) {
            return JSON.stringify({ error: `运行时错误: ${e instanceof Error ? e.message : String(e)}` })
          }
          if (result === undefined || result === null) return ''
          if (typeof result === 'string') return result
          return JSON.stringify(result)
        }
      } catch (e) {
        return JSON.stringify({ error: `code 语法错误: ${e instanceof Error ? e.message : String(e)}` })
      }

      try {
        registry.registerDynamic(new BuiltinTool(
          {
            type: 'function',
            function: { name, description, parameters: paramsSchema }
          },
          runner,
          code
        ))
        console.log('动态工具注册成功', name, description, paramsSchema)
        return JSON.stringify({ ok: true, name, message: `工具 ${name} 已注册成功，下一轮对话可使用` })
      } catch (e) {
        return JSON.stringify({ error: `注册失败: ${e instanceof Error ? e.message : String(e)}` })
      }
    },
    `// 运行时沙箱：new Function + registerDynamic
async (args) => {
  const name = String(args.name ?? '').trim()
  const description = String(args.description ?? '').trim()
  const code = String(args.code ?? '')
  const parameters = args.parameters
  if (!name) return JSON.stringify({ error: 'name 不能为空' })
  if (!code.trim()) return JSON.stringify({ error: 'code 不能为空' })

  let paramsSchema = { type: 'object', properties: {} }
  if (parameters && typeof parameters === 'object') {
    const p = parameters
    paramsSchema = {
      type: 'object',
      properties: p.properties ?? {},
      required: Array.isArray(p.required) ? p.required : undefined
    }
  }

  let runner
  try {
    const fn = new Function('args', \`'use strict'; return (async function(){ \${code} })()\`)
    runner = async (a) => {
      try {
        const result = await fn(a)
        if (result === undefined || result === null) return ''
        if (typeof result === 'string') return result
        return JSON.stringify(result)
      } catch (e) {
        return JSON.stringify({ error: \`运行时错误: \${e.message}\` })
      }
    }
  } catch (e) {
    return JSON.stringify({ error: \`code 语法错误: \${e.message}\` })
  }

  registry.registerDynamic(new BuiltinTool(
    { type: 'function', function: { name, description, parameters: paramsSchema } },
    runner
  ))
  return JSON.stringify({ ok: true, name })
}`
  ))

  // 7. 卸载动态工具
  registry.registerBuiltin(new BuiltinTool(
    {
      type: 'function',
      function: {
        name: 'remove_tool',
        description: '卸载之前通过 define_tool 动态注册的工具。只影响动态工具，不影响内置的 json_parse 等。',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '要卸载的工具名' }
          },
          required: ['name']
        }
      }
    },
    async (args) => {
      const name = String(args.name ?? '').trim()
      if (!name) return JSON.stringify({ error: 'name 不能为空' })
      const ok = registry.deleteDynamic(name)
      return JSON.stringify({ ok, name, message: ok ? `工具 ${name} 已卸载` : `未找到动态工具 ${name}` })
    },
    `async (args) => {
  const name = String(args.name ?? '').trim()
  if (!name) return JSON.stringify({ error: 'name 不能为空' })
  const ok = registry.deleteDynamic(name)
  return JSON.stringify({ ok, name, message: ok ? \`工具 \${name} 已卸载\` : \`未找到动态工具 \${name}\` })
}`
  ))

  // 8. 询问用户意见——暂停 loop，等用户选择后继续
  registry.registerBuiltin(new BuiltinTool(
    {
      type: 'function',
      function: {
        name: 'ask_user',
        description:
          '当任务有多种走法、信息不足需要用户决策、或想确认方向时，弹出选项让用户选择。' +
          '会暂停执行直到用户选完；用户选完后你拿到 answer 继续后续任务。',
        parameters: {
          type: 'object',
          properties: {
            question: { type: 'string', description: '你想问用户的问题或需要决策的方向' },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: '给用户展示的选项列表，建议 2~6 个'
            },
            multiple: { type: 'boolean', description: '是否允许用户多选，默认 false（单选）' }
          },
          required: ['question', 'options']
        }
      }
    },
    async (args) => {
      const question = String(args.question ?? '').trim()
      const rawOpts = args.options
      if (!question) return JSON.stringify({ error: 'question 不能为空' })
      if (!Array.isArray(rawOpts) || rawOpts.length === 0) {
        return JSON.stringify({ error: 'options 必须是非空数组' })
      }
      const options = rawOpts.map((o: unknown) => String(o)).filter(s => s.trim() !== '')
      if (options.length === 0) return JSON.stringify({ error: 'options 为空' })
      const multiple = Boolean(args.multiple)

      if (!registry.userPromptHandler) {
        return JSON.stringify({ error: 'UI 未就绪，暂时无法询问用户' })
      }

      try {
        const resp = await registry.userPromptHandler({ question, options, multiple })
        return JSON.stringify(resp)
      } catch (e) {
        return JSON.stringify({
          error: `ask_user 被中断: ${e instanceof Error ? e.message : String(e)}`
        })
      }
    },
    `// 暂停执行，等用户在弹窗里选完后返回
async (args) => {
  const question = String(args.question ?? '').trim()
  const rawOpts = args.options
  if (!question) return JSON.stringify({ error: 'question 不能为空' })
  if (!Array.isArray(rawOpts) || rawOpts.length === 0)
    return JSON.stringify({ error: 'options 必须是非空数组' })
  const options = rawOpts.map(o => String(o)).filter(s => s.trim() !== '')
  const multiple = Boolean(args.multiple)
  if (!registry.userPromptHandler) return JSON.stringify({ error: 'UI 未就绪' })
  try {
    const resp = await registry.userPromptHandler({ question, options, multiple })
    return JSON.stringify(resp)
  } catch (e) {
    return JSON.stringify({ error: \`ask_user 被中断: \${e.message}\` })
  }
}`
  ))
}

// ─── 多语言 label ───
const OUTPUT_LABEL = {
  zh: '结果',
  en: 'Result',
  ja: '結果',
  ko: '결과',
  es: 'Resultado',
  ar: 'النتيجة',
  fr: 'Résultat',
  pt: 'Resultado',
  ru: 'Результат',
  hi: 'परिणाम',
  id: 'Hasil',
  de: 'Ergebnis',
  vi: 'Kết quả',
  tr: 'Sonuç',
  it: 'Risultato'
} as const

const SYSTEM_INPUT_LABEL = {
  zh: '系统设定',
  en: 'System',
  ja: 'システム設定',
  ko: '시스템 설정',
  es: 'Sistema',
  ar: 'النظام',
  fr: 'Système',
  pt: 'Sistema',
  ru: 'Система',
  hi: 'सिस्टम',
  id: 'Sistem',
  de: 'System',
  vi: 'Hệ thống',
  tr: 'Sistem',
  it: 'Sistema'
} as const

const PROMPT_INPUT_LABEL = {
  zh: '用户提示',
  en: 'Prompt',
  ja: 'プロンプト',
  ko: '프롬프트',
  es: 'Prompt',
  ar: 'موجه',
  fr: 'Prompt',
  pt: 'Prompt',
  ru: 'Промпт',
  hi: 'Prompt',
  id: 'Prompt',
  de: 'Prompt',
  vi: 'Prompt',
  tr: 'Prompt',
  it: 'Prompt'
} as const

// ─── 主节点类 ───

export class HarnessNode extends Node {
  static readonly TYPE = 'harness-llm'
  readonly type = HarnessNode.TYPE

  // 端口
  readonly systemInput = new InputPort('system', {
    accepts: [StringValue],
    label: SYSTEM_INPUT_LABEL
  })
  readonly promptInput = new InputPort('prompt', {
    accepts: [StringValue, ImgFileValue, MultiModalValue],
    label: PROMPT_INPUT_LABEL
  })
  private resultOutput!: OutputPort
  readonly sendPort = new MethodPort('send', { label: { zh: '发送', en: 'Send' } })
  readonly cancelPort = new MethodPort('cancel', { label: { zh: '取消', en: 'Cancel' } })

  // 内部状态
  private localPrompt = ''
  private localSystem = ''
  private result = ''
  private _status: 'idle' | 'loading' | 'done' | 'error' = 'idle'
  private errorMessage = ''
  private maxIterations = 10
  private jsonOutput = false

  // 核心组件
  private toolRegistry = new ToolRegistry()
  private loop: HarnessLoop

  // 用户决策模式：ask = AI 遇到 ask_user 时弹窗等用户选；auto = 跳过弹窗，直接取第一个选项并标记 auto:true
  private _userDecisionMode: 'ask' | 'auto' = 'ask'

  // Model 绑定（LLMNode 实例）
  modelNode: Node | null = null

  // Model 的持久化引用（readState 时存 id，adoptAllChildren 时查 scene）
  private pendingModelChildId: string | null = null

  // 被收养的子节点列表（所有拖进来的节点：Model + Tools）
  readonly children: Node[] = []

  // 持久化用：childIds 用于批量恢复收养关系，canvasBindings 用于 Tool 绑定
  private pendingChildIds: string[] = []

  /** 挂起中的 ask_user 请求，null 表示当前没有等待用户决策 */
  private _pendingPrompt: PendingUserPrompt | null = null
  /** 对应的 resolve 回调，用户选完后 resolve Promise → loop 继续 */
  private _pendingPromptResolve: ((resp: UserPromptResponse) => void) | null = null

  constructor(id: string) {
    super(id)
    this.resultOutput = this.buildOutputPort(this.jsonOutput)
    this.addInput(this.systemInput)
    this.addInput(this.promptInput)
    this.addOutput(this.resultOutput)
    this.addMethod(this.sendPort)
    this.sendPort.onTrigger(() => this.manualTrigger())
    this.addMethod(this.cancelPort)
    this.cancelPort.onTrigger(() => this.cancelRun())

    this.loop = new HarnessLoop(this.toolRegistry, this.maxIterations)
    registerBuiltinTools(this.toolRegistry)
    // 动态工具增删 → 实时刷新 UI（LLM 运行过程中 define_tool / remove_tool 生效）
    this.toolRegistry.onChange = () => this.notifyChanged()
    // ask_user 暂停 → 展示选项弹窗；用户选完 → resolve Promise → loop 继续
    this.toolRegistry.userPromptHandler = (req) => this.handleUserPrompt(req)
    // ask_user 是否注册进 ToolRegistry，让 LLM 可见：取决于初始决策模式
    if (this._userDecisionMode === 'auto') {
      this.toolRegistry.setBuiltinsEnabled(['ask_user'], false)
    }

    this.setBox(360, 420)
  }

  private buildOutputPort(json: boolean): OutputPort {
    return new OutputPort('result', json ? JsonValue : StringValue, OUTPUT_LABEL)
  }

  // ─── 容器收养（仿照 FolderNode） ───

  /** 收养一个节点：标记 containerNode = this，加入 children[] */
  adoptNode(child: Node): void {
    if (child === this) return
    if (child.containerNode) return
    if (this.isDescendant(child)) return

    child.containerNode = this
    this.children.push(child)
    this.sceneRef?.notifyChanged() // App 层重算顶层节点（被收养的从画布消失）
    this.notifyChanged()
  }

  /** 释放子节点回画布：清 containerNode 让它回到顶层画布渲染层。
   * 注意：不需要补坐标——adoptNode 只改了 containerNode，没动 child.position，
   * 它一直就是画布绝对坐标，释放后直接在原地可见。 */
  removeChild(child: Node): void {
    const idx = this.children.findIndex(c => c.id === child.id)
    if (idx < 0) { return }
    this.children.splice(idx, 1)

    child.containerNode = undefined

    // 如果是 Model 槽位，清 modelNode
    if (child === this.modelNode) {
      this.modelNode = null
      this.loop.setModelNode(null)
    }
    // 如果是 Tool 槽位，清 binding（按 nodeId 找对应的 toolName 删）
    this.toolRegistry.removeCanvasToolByNodeId(child.id)

    this.sceneRef?.notifyChanged()
    this.notifyChanged()
  }

  /** 判断 child 是否在我的祖先链里（防成环） */
  private isDescendant(child: Node): boolean {
    let cur: Node | undefined = this.containerNode
    while (cur) {
      if (cur === child) return true
      cur = cur.containerNode
    }
    return false
  }

  /** 恢复收尾：sceneRef 里所有节点都已就绪后调用 */
  adoptAllChildren(): void {
    // 先恢复 Model（pendingModelChildId 是 readState 里存的，此时 sceneRef 里应该有了）
    if (this.pendingModelChildId) {
      const modelNode = this.sceneRef?.getNode(this.pendingModelChildId)
      if (modelNode) {
        this.modelNode = modelNode
        this.loop.setModelNode(modelNode)
      }
      this.pendingModelChildId = null
    }

    // 再收养 pendingChildIds（readState 里存的）
    for (const id of this.pendingChildIds) {
      const child = this.sceneRef?.getNode(id)
      if (child && child !== this) {
        // 如果是 Model 类型，设 modelNode
        if (child.type === 'llm' && !this.modelNode) {
          this.modelNode = child
          this.loop.setModelNode(child)
        }
        this.adoptNode(child)
      }
    }
    this.pendingChildIds = []

    // 再把 canvasBindings 里的节点也拉进来收养（它们可能不在 childIds 里）
    const bindings = this.toolRegistry.getAllCanvasBindings()
    for (const b of bindings) {
      const node = this.sceneRef?.getNode(b.nodeId)
      if (node && !this.children.includes(node)) {
        this.adoptNode(node)
      }
    }

    // 最后确保 modelNode 也在 children 里
    if (this.modelNode && !this.children.includes(this.modelNode)) {
      this.adoptNode(this.modelNode)
    }

    // 关键：把 toolRegistry 里 CanvasNodeTool._node 从 null 刷新成 scene 里的真实实例
    this.toolRegistry.refreshAllCanvasToolNodes()
  }

  // ─── 端口输入变化 ───

  inputPortReceiveValue(ports: InputPort[], _source: InputPortChangeSource): void {
    this.notifyChanged()
    // promptInput 或 systemInput 变化 → 自动执行
    const changedIds = ports.map(p => p.id)
    if (changedIds.includes('prompt') || changedIds.includes('system')) {
      this.manualTrigger()
    }
  }

  /** 本节点不接收外部文件拖入 */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }
  onFileDrop(_sourcePath: string): void { /* noop */ }

  // ─── 拖入判定 ───

  /** 接受两种拖入：LLMNode 绑定 Model，其他有输出端口的节点绑定 Tool */
  isPositionAcceptNodeDrop(source: Node): boolean {
    const isLLM = source.type === 'llm'
    const hasOutputs = source.outputPorts.length > 0
    return isLLM || hasOutputs
  }

  onNodeDrop(source: Node, _startPos: readonly [number, number]): boolean {
    // 如果 source 已经在 children 里了，不重复收（按 id 匹配，避免 Vue Proxy !== 原始对象）
    if (this.children.some(c => c.id === source.id)) return true

    if (source.type === 'llm') {
      // Model 槽位：先释放旧的（如果有），再收养新的
      if (this.modelNode) {
        this.removeChild(this.modelNode)
      }
      this.modelNode = source
      this.loop.setModelNode(source)
    } else {
      // Tool 槽位：自动推导 binding
      const binding = this.deriveToolBinding(source)
      this.toolRegistry.bindNode(binding)
    }

    // 收养节点（画布层自动隐藏）
    this.adoptNode(source)
    this.notifyChanged()
    return true
  }

  /** 自动推导 Tool 绑定：参数从输入端口、输出取第一个 */
  private deriveToolBinding(node: Node): CanvasToolBinding {
    const inputs: Record<string, string> = {}
    for (const p of node.inputPorts) {
      inputs[p.id] = p.id // 最简单的映射：参数名 = 端口 id
    }
    const firstOutput = node.outputPorts[0]
    const toolName = `${node.type.replace(/-/g, '_')}_${node.id.split('-').pop() ?? ''}`

    // 根据节点 type 给出一个像样的默认 description（LLM 决定什么时候调这个 tool 全靠它）
    const typeHints: Record<string, string> = {
      'http-request': 'Send an HTTP request (GET/POST/PUT/DELETE) to a URL and return the response body as text',
      'http': 'Send an HTTP request to a URL and return the response',
      'code': 'Run a JavaScript snippet and return the result',
      'table': 'Execute an SQL query (SELECT/INSERT/UPDATE/DELETE) against the embedded SQLite database',
      'string-concat': 'Concatenate multiple string inputs into one',
      'convert': 'Convert a value between types (number↔string↔boolean↔json)',
      'switch': 'Conditionally select one of multiple inputs based on a boolean or match value',
      'merge': 'Merge multiple string or JSON inputs together',
      'json-value': 'Parse a JSON string into an object or output JSON as string',
      'image-gen': 'Generate an image from a text prompt',
      'code-gen': 'Generate code from a description',
      'regex': 'Run a regular expression match or replace on text',
      'text-split': 'Split text into parts',
      'number-input': 'Output a predefined number value',
      'text-input': 'Output a predefined text value'
    }
    let description = typeHints[node.type] ?? node.type.replace(/-/g, ' ')
    // 追加输入输出端口的简要说明
    const inputDesc = node.inputPorts.map(p => p.id).join(', ')
    const outputDesc = firstOutput ? firstOutput.id : 'result'
    description += `\nInputs: ${inputDesc || '(none)'}\nOutput: ${outputDesc}`

    return {
      nodeId: node.id,
      toolName,
      description,
      inputMapping: inputs,
      outputPortId: firstOutput?.id ?? 'result'
    }
  }

  // ─── Model 槽位 ───

  get hasModel(): boolean {
    return this.modelNode !== null
  }

  /** modelNode 已经是实例，不需要再从 scene 里查了 */

  // ─── Tool 列表 ───

  get canvasTools(): CanvasToolBinding[] {
    return this.toolRegistry.getAllCanvasBindings()
  }

  /** 所有工具（内置 + LLM 动态注册）的详情列表（schema + 源码），用于 UI 展示 */
  get builtinToolInfos(): BuiltinToolInfo[] {
    return this.toolRegistry.getAllToolInfos()
  }

  removeTool(toolName: string): void {
    this.toolRegistry.removeCanvasTool(toolName)
    this.notifyChanged()
  }

  /** 更新一个 Canvas Tool 绑定的 toolName / description。toolName 变了会重新注册。 */
  updateToolBinding(oldToolName: string, patch: { toolName?: string; description?: string }): void {
    this.toolRegistry.updateBinding(oldToolName, patch)
    this.notifyChanged()
  }

  // ─── Prompt ───

  get displayPrompt(): string {
    return this.localPrompt
  }
  setPrompt(text: string): void {
    this.localPrompt = text
    this.notifyChanged()
  }

  /**
   * 把用户在 UI 里编辑的 text + 上传图片一次性组装成 MultiModalValue，
   * 直接 commit 到 promptInput 并触发执行。
   * 给 render.vue 的多模态输入框用。
   */
  commitPromptMm(parts: MultiModalPart[]): void {
    const mm = new MultiModalValue(parts)
    // 直接写入 promptInput.lastReceiveValue + 触发变更，绕过 Edge
    this.promptInput.lastReceiveValue = mm
    this._onInputPortChanged([this.promptInput], 'receive' as InputPortChangeSource)
  }

  // ─── ask_user 暂停 / 恢复 ───

  /** UI 订阅：返回当前挂起的 ask_user 记录（只读） */
  get pendingUserPrompt(): PendingUserPrompt | null {
    return this._pendingPrompt
  }

  /** ToolRegistry.userPromptHandler 的实现：挂起 loop、开弹窗、等用户选完 resolve */
  private async handleUserPrompt(req: UserPromptRequest): Promise<UserPromptResponse> {
    const handle = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return new Promise<UserPromptResponse>((resolve) => {
      this._pendingPrompt = { ...req, handle }
      this._pendingPromptResolve = resolve
      this.notifyChanged() // 通知 UI 开弹窗
    }).finally(() => {
      this._pendingPrompt = null
      this._pendingPromptResolve = null
      this.notifyChanged() // 通知 UI 关弹窗
    })
  }

  /** UI 调用：用户选中某个选项（单选多选都行），恢复 loop */
  resolveUserPrompt(answer: string | string[]): void {
    if (this._pendingPromptResolve) {
      this._pendingPromptResolve({ answer })
    }
  }

  /** UI 调用：用户点击"取消"，恢复 loop 并带 cancelled 标记，LLM 看到后自己决定怎么应对 */
  cancelPendingPrompt(): void {
    if (this._pendingPromptResolve) {
      this._pendingPromptResolve({ answer: '', cancelled: true })
    }
  }

  get displaySystem(): string {
    return this.localSystem
  }
  setSystem(text: string): void {
    this.localSystem = text
    this.notifyChanged()
  }

  /** promptInput 是否接了边 */
  get promptConnected(): boolean {
    return this.promptInput.incomingEdgeCount > 0
  }
  get systemConnected(): boolean {
    return this.systemInput.incomingEdgeCount > 0
  }

  /** resolveInputs：有连线用端口值，没连线用内部文本。统一返回 MultiModalValue */
  private resolveInputs(): { system: string; promptMm: MultiModalValue } {
    const [sysFirst] = this.systemInput.value
    const system = sysFirst instanceof StringValue && !sysFirst.isNull
      ? sysFirst.value! : this.localSystem

    if (this.promptConnected) {
      // 有连线 → 取端口值，自动包装成 MultiModalValue
      const first = this.promptInput.value[0]
      if (first) {
        return { system, promptMm: wrapAsMultiModal(first) }
      }
    }
    // 没连线 → 用内部文本框
    return {
      system,
      promptMm: new MultiModalValue(
        this.localPrompt ? [{ type: 'text', text: this.localPrompt }] : []
      )
    }
  }

  // ─── 执行控制 ───

  get displayStatus(): 'idle' | 'loading' | 'done' | 'error' {
    return this.status
  }

  get displayResult(): string {
    if (this._status === 'error') return this.errorMessage
    return this.result
  }

  get displayTrajectory(): readonly HarnessMessage[] {
    return this.loop.messages.slice()
  }

  get status(): 'idle' | 'loading' | 'done' | 'error' {
    return this._status
  }

  get displayIteration(): number {
    return this.loop.messages.filter(m => m.role === 'assistant').length
  }

  manualTrigger(): void {
    if (this._status === 'loading') return
    if (!this.loop.isModelReady) {
      this._status = 'error'
      this.errorMessage = '请先拖入一个 LLM 节点作为 Model'
      this.notifyChanged()
      return
    }
    const { system, promptMm } = this.resolveInputs()
    if (promptMm.parts.length === 0) {
      this._status = 'idle'
      this.result = ''
      this.errorMessage = ''
      this.notifyChanged()
      return
    }
    void this.doRun(system, promptMm)
  }

  cancelRun(): void {
    this.loop.abort()
    if (this._status === 'loading') {
      this._status = 'idle'
      this.errorMessage = ''
      this.result = ''
      this.failRun()
      this.notifyChanged()
    }
  }

  private async doRun(system: string, promptMm: MultiModalValue): Promise<void> {
    this.beginRun()
    this._status = 'loading'
    this.errorMessage = ''
    this.result = ''
    // 刷新所有 CanvasNodeTool 的节点引用
    this.toolRegistry.refreshAllNodeRefs()
    this.loop.setModelNode(this.modelNode)
    this.notifyChanged()

    try {
      const finalText = await this.loop.run(system, promptMm)
      this.result = finalText
      this._status = 'done'

      if (this.jsonOutput) {
        try {
          const parsed = JSON.parse(finalText)
          this.resultOutput.commit(new JsonValue(parsed))
        } catch {
          this.resultOutput.commit(new StringValue(finalText))
        }
      } else {
        this.resultOutput.commit(new StringValue(finalText))
      }
      this.completeRun()
    } catch (err) {
      if ((err as Error).message === 'aborted') {
        // 用户取消，保持 cancelRun 设置的状态
        return
      }
      this.errorMessage = err instanceof Error ? err.message : String(err)
      this._status = 'error'
      this.failRun()
    }
    this.notifyChanged()
  }

  // ─── 配置 getter/setter ───

  get displayMaxIterations(): number {
    return this.maxIterations
  }
  setMaxIterations(v: number): void {
    const clamped = Math.max(1, Math.min(50, Math.floor(v)))
    if (clamped !== this.maxIterations) {
      this.maxIterations = clamped
      this.loop = new HarnessLoop(this.toolRegistry, this.maxIterations)
      this.notifyChanged()
    }
  }

  get displayJsonOutput(): boolean {
    return this.jsonOutput
  }
  setJsonOutput(v: boolean): void {
    if (v === this.jsonOutput) return
    this.jsonOutput = v
    this.removeOutput(this.resultOutput)
    this.resultOutput = this.buildOutputPort(v)
    this.addOutput(this.resultOutput)
    this.result = ''
    this.notifyChanged()
  }

  // ─── 用户决策模式 ───
  get userDecisionMode(): 'ask' | 'auto' {
    return this._userDecisionMode
  }
  setUserDecisionMode(v: 'ask' | 'auto'): void {
    if (v !== 'ask' && v !== 'auto') return
    if (v === this._userDecisionMode) return
    this._userDecisionMode = v
    // ask 模式 → ask_user 注册进 ToolRegistry，LLM 可见；auto 模式 → 摘掉，LLM 不可见
    this.toolRegistry.setBuiltinsEnabled(['ask_user'], v === 'ask')
    this.notifyChanged()
  }

  // ─── 内置工具激活/禁用（可持久化） ───
  /** 被禁用的内置工具名集合（禁用后从 ToolRegistry 摘掉，LLM 不可见） */
  private _disabledBuiltins: Set<string> = new Set()

  /** 查询某个内置工具是否激活 */
  getBuiltinEnabled(name: string): boolean {
    return this.toolRegistry.isBuiltinEnabled(name)
  }

  /** 切换某个内置工具的激活状态 */
  setBuiltinEnabled(name: string, enabled: boolean): void {
    if (!this.toolRegistry.getBuiltinNames().includes(name)) return
    if (enabled) {
      this._disabledBuiltins.delete(name)
    } else {
      this._disabledBuiltins.add(name)
    }
    this.toolRegistry.setBuiltinsEnabled([name], enabled)
  }

  // ─── 持久化 ───

  saveState(): Record<string, unknown> {
    const childIds = this.children.map(c => c.id)
    return {
      ...super.saveState(),
      modelChildId: this.modelNode?.id ?? null,
      childIds,
      maxIterations: this.maxIterations,
      jsonOutput: this.jsonOutput,
      userDecisionMode: this._userDecisionMode,
      disabledBuiltins: Array.from(this._disabledBuiltins),
      localPrompt: this.localPrompt,
      localSystem: this.localSystem,
      canvasBindings: this.toolRegistry.getAllBindings()
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    // readState 阶段 scene 里的节点可能还没加载完，只存 id 不查 scene。
    // 所有恢复逻辑交给 adoptAllChildren（App.vue 在恢复第 4 步统一调）。

    if (typeof (state as any).modelChildId === 'string') {
      this.pendingModelChildId = (state as any).modelChildId
    }

    const childIds: string[] = []
    if (Array.isArray((state as any).childIds)) {
      for (const id of (state as any).childIds) {
        if (typeof id === 'string') childIds.push(id)
      }
    }
    this.pendingChildIds = childIds
    if (typeof state.maxIterations === 'number') {
      this.maxIterations = Math.max(1, Math.min(50, Math.floor(state.maxIterations)))
      this.loop = new HarnessLoop(this.toolRegistry, this.maxIterations)
    }
    if (typeof state.jsonOutput === 'boolean' && state.jsonOutput !== this.jsonOutput) {
      this.jsonOutput = state.jsonOutput
      this.removeOutput(this.resultOutput)
      this.resultOutput = this.buildOutputPort(state.jsonOutput)
      this.addOutput(this.resultOutput)
    }
    if (state.userDecisionMode === 'ask' || state.userDecisionMode === 'auto') {
      this._userDecisionMode = state.userDecisionMode
      // 同步 ask_user 的激活状态到 ToolRegistry
      if (state.userDecisionMode === 'auto') {
        this.toolRegistry.setBuiltinsEnabled(['ask_user'], false)
      }
    }
    if (Array.isArray(state.disabledBuiltins)) {
      const names: string[] = []
      for (const n of state.disabledBuiltins) {
        if (typeof n === 'string') {
          this._disabledBuiltins.add(n)
          names.push(n)
        }
      }
      if (names.length > 0) this.toolRegistry.setBuiltinsEnabled(names, false)
    }
    if (typeof state.localPrompt === 'string') {
      this.localPrompt = state.localPrompt
    }
    if (typeof state.localSystem === 'string') {
      this.localSystem = state.localSystem
    }

    // 画布恢复后，重新绑定 Canvas 节点工具 + 收养关系
    const bindings = (state as any).canvasBindings
    if (Array.isArray(bindings)) {
      for (const b of bindings) {
        if (b && typeof b.nodeId === 'string') {
          this.toolRegistry.bindNode({
            nodeId: b.nodeId,
            toolName: b.toolName ?? b.nodeId,
            description: b.description ?? '',
            inputMapping: b.inputMapping ?? {},
            outputPortId: b.outputPortId ?? 'result'
          })
        }
      }
    }
  }

  async beforeDestroy(): Promise<void> {
    this.cancelRun()
    // 释放所有子节点回画布
    while (this.children.length > 0) {
      const child = this.children[0]
      // 直接清除 containerNode 并把节点放回世界坐标
      const [wx, wy] = this.worldPosition
      const [lx, ly] = child.position
      child.setPosition(wx + lx, wy + ly)
      child.containerNode = undefined
      this.children.shift()
    }
    this.modelNode = null
  }

  /** sceneRef 就绪后：恢复子节点收养关系 */
  onReady(): Promise<void> | void {
    // 先收养 pending（从 saveState 恢复的 childIds）
    this.adoptAllChildren()
    // 再从 scene 里把所有 canvasBindings 对应的节点也拉进来收养
    const bindings = this.toolRegistry.getAllCanvasBindings()
    for (const b of bindings) {
      const node = workspaceScene.getNode(b.nodeId)
      if (node && !this.children.includes(node)) {
        this.adoptNode(node)
      }
    }
    // Model 节点也要确保在 children 里
    if (this.modelNode && !this.children.includes(this.modelNode)) {
      this.adoptNode(this.modelNode)
    }
  }
}
