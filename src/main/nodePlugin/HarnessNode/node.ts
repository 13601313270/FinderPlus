import { StringValue } from '../../engine/data/StringValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import type { Value } from '../../engine/data/Value'
import type { InputPortChangeSource } from '../../engine/node/Node'
import type { RawChatResponse } from '../LLMNode/node'

/** HarnessNode 内部使用的 message 格式 */
export interface HarnessMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
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

/** 内置工具：纯 JS 函数实现 */
class BuiltinTool implements HarnessTool {
  constructor(
    readonly schema: ToolSchema,
    private fn: (args: Record<string, unknown>) => Promise<string> | string
  ) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const result = await this.fn(args)
    return typeof result === 'string' ? result : JSON.stringify(result)
  }
}

/** Canvas 节点绑定的 Tool：commit → wait → read output */
class CanvasNodeTool implements HarnessTool {
  constructor(
    private binding: CanvasToolBinding,
    private node: Node | null // null 表示节点已被删除
  ) {}

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
    this.node = workspaceScene.getNode(this.binding.nodeId) ?? null
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
      // 手动触发脏标记和计算
      node._onInputPortChanged([port], 'receive' as InputPortChangeSource)
    }

    // Step 2: 如果节点有 sendPort（手动触发型），调 sendPort.trigger()
    const sendPort = node.methodPorts.find(m => m.id === 'send')
    if (sendPort && typeof (sendPort as any).trigger === 'function') {
      ;(sendPort as any).trigger()
    }

    // Step 3: 等节点稳定
    try {
      await waitForNodeStable(node, { timeoutMs: 30000 })
    } catch (err) {
      return JSON.stringify({ error: `等待节点超时：${err instanceof Error ? err.message : String(err)}` })
    }

    // Step 4: 从输出端口读值
    const output = node.outputPorts.find(p => p.id === this.binding.outputPortId)
    if (!output) {
      // 找不到指定 outputPort，尝试用第一个有值的
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

/** Tool 注册表：内置工具 + Canvas 节点工具统一管理 */
class ToolRegistry {
  private builtin = new Map<string, HarnessTool>()
  private canvas = new Map<string, CanvasNodeTool>()

  registerBuiltin(tool: HarnessTool): void {
    this.builtin.set(tool.schema.function.name, tool)
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
    for (const t of this.canvas.values()) {
      if (t.isNodeAlive) result.push(t)
    }
    return result
  }

  getToolSchemas(): ToolSchema[] {
    return this.getValidTools().map(t => t.schema)
  }

  async execute(name: string, args: Record<string, unknown>): Promise<string> {
    const tool = this.builtin.get(name) ?? this.canvas.get(name)
    if (!tool) {
      return JSON.stringify({ error: `工具未找到: ${name}` })
    }
    return tool.execute(args)
  }

  getAllCanvasBindings(): CanvasToolBinding[] {
    return Array.from(this.canvas.values()).map(t => t['binding'])
  }

  getAllBindings(): CanvasToolBinding[] {
    return Array.from(this.canvas.values()).map(t => t['binding'])
  }
}

/** ReAct 消息循环 */
class HarnessLoop {
  messages: HarnessMessage[] = []
  private iteration = 0
  private aborted = false
  private llmNode: Node | null = null

  constructor(
    private toolRegistry: ToolRegistry,
    private maxIterations: number
  ) {}

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

  async run(system: string, prompt: string): Promise<string> {
    this.messages = [
      { role: 'system', content: system || 'You are a helpful assistant. Use tools when needed.' },
      { role: 'user', content: prompt }
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
          this.messages.map(m => ({
            role: m.role,
            content: m.content,
            tool_call_id: m.tool_call_id,
            name: m.name
          })),
          this.toolRegistry.getToolSchemas()
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        // 把错误也追加到轨迹里，让 UI 可见
        this.messages.push({
          role: 'assistant',
          content: `[LLM 调用失败: ${msg}]`
        })
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

      // Step 4: 并发执行所有 tool_calls
      const toolResults = await Promise.all(
        raw.tool_calls.map(call => this.executeOneTool(call))
      )
      this.messages.push(...toolResults)
    }

    // 超过 maxIterations → 返回最后一条 assistant 消息
    const lastAssistant = [...this.messages].reverse().find(m => m.role === 'assistant')
    return lastAssistant?.content ?? ''
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

/** 等待节点 state 变成 stable / error / dirty（任一完成态） */
function waitForNodeStable(node: Node, opts: { timeoutMs: number }): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('timeout'))
    }, opts.timeoutMs)

    const unsub = node.onChanged(() => {
      if (node.state === 'stable' || node.state === 'error' || node.state === 'dirty') {
        cleanup()
        resolve()
      }
    })

    function cleanup() {
      clearTimeout(timer)
      unsub()
    }
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
    }
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
    }
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
    }
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
    }
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
    }
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
    accepts: [StringValue],
    label: PROMPT_INPUT_LABEL
  })
  private resultOutput!: OutputPort
  readonly sendPort = new MethodPort('send', { label: { zh: '发送', en: 'Send' } })
  readonly cancelPort = new MethodPort('cancel', { label: { zh: '取消', en: 'Cancel' } })

  // 内部状态
  private localPrompt = ''
  private localSystem = ''
  private result = ''
  private status: 'idle' | 'loading' | 'done' | 'error' = 'idle'
  private errorMessage = ''
  private maxIterations = 10
  private jsonOutput = false

  // 核心组件
  private toolRegistry = new ToolRegistry()
  private loop: HarnessLoop

  // Model 绑定（LLMNode 实例）
  modelNode: Node | null = null

  // Model 的持久化引用（readState 时存 id，adoptAllChildren 时查 scene）
  private pendingModelChildId: string | null = null

  // 被收养的子节点列表（所有拖进来的节点：Model + Tools）
  readonly children: Node[] = []

  // 持久化用：childIds 用于批量恢复收养关系，canvasBindings 用于 Tool 绑定
  private pendingChildIds: string[] = []

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

  /** 释放子节点回画布：清 containerNode，补世界坐标让它原地留在画布上 */
  removeChild(child: Node): void {
    const idx = this.children.indexOf(child)
    if (idx < 0) return
    this.children.splice(idx, 1)

    const [wx, wy] = this.worldPosition
    const [lx, ly] = child.position
    child.setPosition(wx + lx, wy + ly)
    child.containerNode = undefined

    // 如果是 Model 槽位，清 modelNode
    if (child === this.modelNode) {
      this.modelNode = null
      this.loop.setModelNode(null)
    }
    // 如果是 Tool 槽位，清 binding
    this.toolRegistry.removeCanvasTool(child.id)

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
  }

  // ─── 端口输入变化 ───

  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    // 拖入 Tool 节点时，我们是直接改 port.lastReceiveValue + 调 _onInputPortChanged
    // 那时 Node 自己的端口也可能也被监听，但这没关系——CanvasNodeTool 内部 await
    // 等节点自己处理完就够了
    this.notifyChanged()
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
    // 如果 source 已经在 children 里了，不重复收
    if (this.children.includes(source)) return true

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
    return {
      nodeId: node.id,
      toolName,
      description: node.constructor.name,
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

  removeTool(toolName: string): void {
    this.toolRegistry.removeCanvasTool(toolName)
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

  /** resolveInputs：有连线用端口值，没连线用内部文本 */
  private resolveInputs(): { system: string; prompt: string } {
    const [sysFirst] = this.systemInput.value
    const system = sysFirst instanceof StringValue && !sysFirst.isNull
      ? sysFirst.value! : this.localSystem

    let prompt = this.localPrompt
    if (this.promptConnected) {
      const [promptFirst] = this.promptInput.value
      if (promptFirst instanceof StringValue && !promptFirst.isNull) {
        prompt = promptFirst.value!
      }
    }
    return { system, prompt }
  }

  // ─── 执行控制 ───

  get displayStatus(): 'idle' | 'loading' | 'done' | 'error' {
    return this.status
  }

  get displayResult(): string {
    if (this.status === 'error') return this.errorMessage
    return this.result
  }

  get displayTrajectory(): readonly HarnessMessage[] {
    return this.loop.messages.slice()
  }

  get displayIteration(): number {
    return this.loop.messages.filter(m => m.role === 'assistant').length
  }

  manualTrigger(): void {
    if (this.status === 'loading') return
    if (!this.loop.isModelReady) {
      this.status = 'error'
      this.errorMessage = '请先拖入一个 LLM 节点作为 Model'
      this.notifyChanged()
      return
    }
    const { system, prompt } = this.resolveInputs()
    if (!prompt.trim()) {
      this.status = 'idle'
      this.result = ''
      this.errorMessage = ''
      this.notifyChanged()
      return
    }
    void this.doRun(system, prompt)
  }

  cancelRun(): void {
    this.loop.abort()
    if (this.status === 'loading') {
      this.status = 'idle'
      this.errorMessage = ''
      this.result = ''
      this.failRun()
      this.notifyChanged()
    }
  }

  private async doRun(system: string, prompt: string): Promise<void> {
    this.beginRun()
    this.status = 'loading'
    this.errorMessage = ''
    this.result = ''
    // 刷新所有 CanvasNodeTool 的节点引用
    this.toolRegistry.refreshAllNodeRefs()
    this.loop.setModelNode(this.modelNode)
    this.notifyChanged()

    try {
      const finalText = await this.loop.run(system, prompt)
      this.result = finalText
      this.status = 'done'

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
      this.status = 'error'
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

  // ─── 持久化 ───

  saveState(): Record<string, unknown> {
    const childIds = this.children.map(c => c.id)
    return {
      ...super.saveState(),
      modelChildId: this.modelNode?.id ?? null,
      childIds,
      maxIterations: this.maxIterations,
      jsonOutput: this.jsonOutput,
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
