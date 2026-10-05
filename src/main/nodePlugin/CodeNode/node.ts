import { BoolValue } from '../../engine/data/BoolValue'
import { djb2 } from '../../engine/data/hash'
import { FileValue } from '../../engine/data/FileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { Value } from '../../engine/data/Value'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** 可选的端口类型：输入和输出共用同一套 Value 子类集合 */
export type CodePortKind = 'number' | 'string' | 'bool' | 'file' | 'imgfile' | 'json'

/** 输入端口可选类型（不含 imgfile——输入侧图片归为 file，原型链覆盖） */
export type CodeInputKind = Exclude<CodePortKind, 'imgfile'>

/** 返回类型别名（保留给外部引用，实际用 CodePortKind） */
export type CodeReturnKind = CodePortKind

/**
 * 端口名校验失败的原因。
 * 只描述"错在哪"，不含任何展示文案——由渲染层用节点自己的 i18n 翻译。
 */
export type CodePortNameError =
  | { readonly kind: 'empty' }
  | { readonly kind: 'invalid-ident' }
  | { readonly kind: 'reserved'; readonly name: string }
  | { readonly kind: 'duplicate-input'; readonly name: string }
  | { readonly kind: 'duplicate-output'; readonly name: string }
  | { readonly kind: 'conflict-input'; readonly name: string }

/** 所有合法的输入端口 kind，readState 反序列化校验用。用 satisfies 保证不缺项 */
const INPUT_KINDS: readonly CodeInputKind[] = ['number', 'string', 'bool', 'file', 'json'] as const
/** 所有合法的输出端口 kind，readState 反序列化校验用 */
const ALL_PORT_KINDS: readonly CodePortKind[] = ['number', 'string', 'bool', 'file', 'imgfile', 'json'] as const

/** Value 子类注册表：kind → Value 子类（端口 accept / 结果包装共用这一处真相） */
const KIND_CLASSES: Record<CodePortKind, { readonly VALUE_NAME: string; prototype: Value; new (...args: any[]): Value }> = {
  number: NumberValue,
  string: StringValue,
  bool: BoolValue,
  file: FileValue,
  imgfile: ImgFileValue,
  json: JsonValue
}

/** 输入类型 → InputPort.accepts 数组。file 用 FileValue（原型链覆盖 ImgFileValue / TxtFileValue） */
const INPUT_KIND_ACCEPTS: Record<CodeInputKind, readonly InputPortOptionsAcc[]> = {
  number: [NumberValue],
  string: [StringValue],
  bool: [BoolValue],
  file: [FileValue],
  json: [JsonValue]
}

/** InputPort 构造器 accepts 参数所需的 Value 子类类型 */
type InputPortOptionsAcc = NonNullable<ConstructorParameters<typeof InputPort>[1]['accepts']>[number]

/** OutputPort 构造器所需的 ValueClass 类型 */
type OutputPortValueClass = ConstructorParameters<typeof OutputPort>[1]

/** 执行状态：UI 据此决定按钮可点 / 结果区样式 */
export type CodeStatus = 'idle' | 'running' | 'done' | 'error'

/** 折叠时的最小高度：header(36) + 配置按钮(28) + 结果区 + actions + padding ≈ 140 */
const COLLAPSED_BASE_HEIGHT = 180
/** 折叠时每个端口约占 24px 的最小高度（端口节点 + 竖向间距） */
const PER_PORT_HEIGHT = 24

/** box 固定宽度（永远折叠） */
const NODE_WIDTH = 360

/** box 高度：max(base, 端口最小高度) —— 端口多时 box 自动撑高让 NodePorts 不挤 */
function computeBoxHeight(inputCount: number, outputCount: number): number {
  const portsHeight = (inputCount + outputCount) * PER_PORT_HEIGHT + 16 // +16 给 ports-col 上下一点 padding
  return Math.max(COLLAPSED_BASE_HEIGHT, portsHeight)
}

/** 输入端口的持久化元数据 */
export interface CodeInputMeta {
  /** 端口唯一 id（持久化） */
  id: string
  /** 用户给的变量名（合法 JS 标识符，函数体里直接用它） */
  name: string
  /** 类型：决定 InputPort.accepts 覆盖哪些 Value 子类 */
  kind: CodeInputKind
}

/** 输出端口的持久化元数据 */
export interface CodeOutputMeta {
  /** 端口唯一 id（持久化）——边靠它匹配 */
  id: string
  /** 用户给的端口名——callOutputPort(name, value) 里用它 */
  name: string
  /** 类型：决定 OutputPort 挂哪种 Value 子类 */
  kind: CodePortKind
}

/**
 * 代码节点：把一段 JS 函数体存在节点里，点「执行」跑一次，结果按选定的类型发往下游。
 *
 * 输入端口：用户动态增删、自定义变量名 + 类型。函数体里直接用变量名引用。
 * 输出端口：用户动态增删、自定义端口名 + 类型。函数体里通过 callOutputPort(name, value) 提交值。
 * 调用多少次 callOutputPort 就提交多少次，可以向不同端口各提一次（多输出）。
 *
 * 兼容旧写法：如果函数没有调用 callOutputPort 而是直接 return 一个值，
 * 系统会把它提交到第一个输出端口（名为 "result" 的默认端口）。
 *
 * 执行在 preload 侧（Node 环境 + 共享 renderer 内存），File 对象直接传，new Function 不受 CSP 限制。
 */
export class CodeNode extends Node {
  static readonly TYPE = 'code'
  readonly type = CodeNode.TYPE

  /** 函数体（持久化） */
  private code = ''

  /** 输入端口元数据（持久化）：同步更新 myInputPorts */
  private inputMetas: CodeInputMeta[] = []
  /** 运行时输入端口列表：与 inputMetas 一一对应 */
  private myInputPorts: InputPort[] = []

  /** 输出端口元数据（持久化）：同步更新 myOutputPorts */
  private outputMetas: CodeOutputMeta[] = []
  /** 运行时输出端口列表：与 outputMetas 一一对应 */
  private myOutputPorts: OutputPort[] = []

  /** 上次结果的展示文本 / 错误文本（派生，不持久化） */
  private resultText = ''
  private errorText = ''
  private status: CodeStatus = 'idle'

  /** 自动执行开关（持久化）：打开后每次输入端口收到值都会自动跑一次 run() */
  private autoRunEnabled = false

  /** 折叠状态（持久化）：true 时只保留 header + node__actions，其余收起 */
  private collapsed = false

  constructor(id: string) {
    super(id)
    // 默认给一个输出端口 "result"，方便第一次使用（也兼容旧版直接 return 的写法）
    this.addDefaultOutputPort()
    // box 永远按折叠态高度：根据端口数量动态计算
    this.setBox(NODE_WIDTH, computeBoxHeight(0, 1))
  }

  /** 构造时添加默认输出端口 "result"（number 类型） */
  private addDefaultOutputPort(): void {
    const meta: CodeOutputMeta = {
      id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: 'result',
      kind: 'number'
    }
    this.outputMetas.push(meta)
    const port = this.buildOutputPort(meta)
    this.myOutputPorts.push(port)
    super.addOutput(port)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  // —— 渲染层读的状态 ——

  get displayCode(): string {
    return this.code
  }

  get displayResult(): string {
    return this.resultText
  }

  get displayError(): string {
    return this.errorText
  }

  get displayStatus(): CodeStatus {
    return this.status
  }

  /** 渲染层读当前输入端口元数据列表 */
  get displayInputs(): readonly CodeInputMeta[] {
    return this.inputMetas
  }

  /** 渲染层读当前输出端口元数据列表 */
  get displayOutputs(): readonly CodeOutputMeta[] {
    return this.outputMetas
  }

  /** 渲染层读自动执行开关状态 */
  get displayAutoRun(): boolean {
    return this.autoRunEnabled
  }

  /** 切换自动执行开关；render.vue switch change 时调用 */
  setAutoRun(enabled: boolean): void {
    if (this.autoRunEnabled === enabled) return
    this.autoRunEnabled = enabled
    this.notifyChanged()
  }

  /** 内部：端口增删后 box 高度跟着更新（永远按折叠态算） */
  private updateBoxHeight(): void {
    this.setBox(NODE_WIDTH, computeBoxHeight(this.inputMetas.length, this.outputMetas.length))
  }

  // —— 静态工具：合法 JS 标识符校验（输入端口变量名和输出端口名共用） ——

  private static JS_IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/
  private static RESERVED = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
    'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if',
    'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw',
    'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'let', 'static', 'yield',
    'arguments', 'await', 'callOutputPort'
  ])

  /** 校验端口名是否合法且未重复。返回错误原因（null 表示通过），文案由渲染层翻译 */
  validatePortName(name: string, _excludeId?: string): CodePortNameError | null {
    const trimmed = name.trim()
    if (!trimmed) return { kind: 'empty' }
    if (!CodeNode.JS_IDENT_RE.test(trimmed)) {
      return { kind: 'invalid-ident' }
    }
    if (CodeNode.RESERVED.has(trimmed)) return { kind: 'reserved', name: trimmed }
    return null
  }

  /** 校验输入端口变量名（额外检查重复） */
  validateInputName(name: string, excludeId?: string): CodePortNameError | null {
    const trimmed = name.trim()
    const err = this.validatePortName(trimmed, excludeId)
    if (err) return err
    const dup = this.inputMetas.find(m => m.name === trimmed && m.id !== excludeId)
    if (dup) return { kind: 'duplicate-input', name: trimmed }
    return null
  }

  /** 校验输出端口名（额外检查重复，且不能与输入端口变量名冲突——callOutputPort 的 name 要唯一） */
  validateOutputName(name: string, excludeId?: string): CodePortNameError | null {
    const trimmed = name.trim()
    const err = this.validatePortName(trimmed, excludeId)
    if (err) return err
    const dupOut = this.outputMetas.find(m => m.name === trimmed && m.id !== excludeId)
    if (dupOut) return { kind: 'duplicate-output', name: trimmed }
    const dupIn = this.inputMetas.find(m => m.name === trimmed)
    if (dupIn) return { kind: 'conflict-input', name: trimmed }
    return null
  }

  // —— 输入端口管理 ——

  /** 追加一个输入端口，默认类型 number、默认变量名不冲突的 v1/v2/... */
  addCodeInput(): CodeInputMeta {
    let seq = this.inputMetas.length + 1
    let name = `v${seq}`
    while (this.inputMetas.some(m => m.name === name) || this.outputMetas.some(m => m.name === name)) {
      seq += 1
      name = `v${seq}`
    }
    const meta: CodeInputMeta = {
      id: `in-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      kind: 'number'
    }
    this.inputMetas.push(meta)
    const port = this.buildInputPort(meta)
    this.myInputPorts.push(port)
    super.addInput(port)
    this.updateBoxHeight()
    this.notifyChanged()
    return meta
  }

  /** 删除一个输入端口及其连线 */
  removeCodeInput(id: string): void {
    const idx = this.inputMetas.findIndex(m => m.id === id)
    if (idx === -1) return
    this.inputMetas.splice(idx, 1)
    const port = this.myInputPorts.splice(idx, 1)[0]
    if (port) super.removeInput(port)
    this.updateBoxHeight()
    this.notifyChanged()
  }

  /** 修改某个输入端口的变量名；校验不通过就跳过 */
  setInputName(id: string, newName: string): void {
    const err = this.validateInputName(newName, id)
    if (err) return
    const meta = this.inputMetas.find(m => m.id === id)
    if (!meta) return
    const trimmed = newName.trim()
    if (meta.name === trimmed) return
    meta.name = trimmed
    const port = this.myInputPorts.find(p => p.id === id)
    port?.setLabel({ zh: trimmed, en: trimmed })
    this.notifyChanged()
  }

  /** 修改某个输入端口的类型——重建端口（accepts 变了旧端口不再合法） */
  setInputKind(id: string, kind: CodeInputKind): void {
    const meta = this.inputMetas.find(m => m.id === id)
    if (!meta || meta.kind === kind) return
    meta.kind = kind
    this.rebuildInputPorts()
    this.notifyChanged()
  }

  /** 根据 meta 构造一个新的 InputPort */
  private buildInputPort(meta: CodeInputMeta): InputPort {
    return new InputPort(meta.id, {
      accepts: INPUT_KIND_ACCEPTS[meta.kind] as unknown as ConstructorParameters<typeof InputPort>[1]['accepts'],
      label: { zh: meta.name, en: meta.name }
    })
  }

  /** 全量重建输入端口：删掉所有旧的、按 inputMetas 重新 build 并 addInput。顺序严格：先删后加。 */
  private rebuildInputPorts(): void {
    const oldPorts = [...this.myInputPorts]
    for (const p of oldPorts) {
      super.removeInput(p)
    }
    this.myInputPorts = this.inputMetas.map(m => this.buildInputPort(m))
    for (const p of this.myInputPorts) {
      super.addInput(p)
    }
  }

  // —— 输出端口管理 ——

  /** 追加一个输出端口，默认类型 number、默认端口名不冲突的 port1/port2/... */
  addCodeOutput(): CodeOutputMeta {
    let seq = this.outputMetas.length + 1
    let name = `port${seq}`
    while (
      this.outputMetas.some(m => m.name === name) ||
      this.inputMetas.some(m => m.name === name) ||
      name === 'callOutputPort'
    ) {
      seq += 1
      name = `port${seq}`
    }
    const meta: CodeOutputMeta = {
      id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      kind: 'number'
    }
    this.outputMetas.push(meta)
    const port = this.buildOutputPort(meta)
    this.myOutputPorts.push(port)
    super.addOutput(port)
    this.updateBoxHeight()
    this.notifyChanged()
    return meta
  }

  /** 删除一个输出端口及其连线。至少保留一个——否则 callOutputPort 无处可提交 */
  removeCodeOutput(id: string): void {
    if (this.outputMetas.length <= 1) return
    const idx = this.outputMetas.findIndex(m => m.id === id)
    if (idx === -1) return
    this.outputMetas.splice(idx, 1)
    const port = this.myOutputPorts.splice(idx, 1)[0]
    if (port) super.removeOutput(port)
    this.updateBoxHeight()
    this.notifyChanged()
  }

  /** 修改某个输出端口的名称（callOutputPort 里用的名字）；校验不通过就跳过 */
  setOutputName(id: string, newName: string): void {
    const err = this.validateOutputName(newName, id)
    if (err) return
    const meta = this.outputMetas.find(m => m.id === id)
    if (!meta) return
    const trimmed = newName.trim()
    if (meta.name === trimmed) return
    meta.name = trimmed
    const port = this.myOutputPorts.find(p => p.id === id)
    port?.setLabel({ zh: trimmed, en: trimmed })
    this.notifyChanged()
  }

  /** 修改某个输出端口的类型——重建端口（valueClass 变了旧端口不再合法） */
  setOutputKind(id: string, kind: CodePortKind): void {
    const meta = this.outputMetas.find(m => m.id === id)
    if (!meta || meta.kind === kind) return
    meta.kind = kind
    this.rebuildOutputPorts()
    this.notifyChanged()
  }

  /** 根据 meta 构造一个新的 OutputPort */
  private buildOutputPort(meta: CodeOutputMeta): OutputPort {
    const valueClass = KIND_CLASSES[meta.kind] as OutputPortValueClass
    return new OutputPort(meta.id, valueClass, { zh: meta.name, en: meta.name })
  }

  /** 全量重建输出端口：删掉所有旧的、按 outputMetas 重新 build 并 addOutput。顺序严格：先删后加。 */
  private rebuildOutputPorts(): void {
    const oldPorts = [...this.myOutputPorts]
    for (const p of oldPorts) {
      super.removeOutput(p)
    }
    this.myOutputPorts = this.outputMetas.map(m => this.buildOutputPort(m))
    for (const p of this.myOutputPorts) {
      super.addOutput(p)
    }
  }

  /** 根据输出端口名查找端口实例 */
  private findOutputPortByName(name: string): { meta: CodeOutputMeta; port: OutputPort } | undefined {
    for (let i = 0; i < this.outputMetas.length; i++) {
      const meta = this.outputMetas[i]!
      if (meta.name === name) {
        const port = this.myOutputPorts[i]
        if (port) return { meta, port }
      }
    }
    return undefined
  }

  // —— 用户操作 ——

  /** 保存函数体；编辑区 input 时调用（不触发执行） */
  setCode(text: string): void {
    if (text === this.code) return
    this.code = text
    this.notifyChanged()
  }

  /**
   * 执行当前代码；UI 的「执行」按钮点击时调用。
   *
   * 架构：preload 侧共享 renderer 内存，callOutputPort 每次触发（无论同步、
   * Promise.then 还是 setTimeout/setInterval 里的延迟调用）都能即时调 renderer 侧回调，
   * 立即 commit 对应端口。不再等整个执行"跑完"才一起提交。
   *
   * 流程：
   * 1. 从所有输入端口取值、解包成原始值/File、组装成 args 对象
   * 2. 构造 onOutput 回调：每次触发 → 查端口 → coerce → commit → 更新结果展示
   * 3. 同步执行 codeApi.run —— 返回值只表示"函数能不能构造、同步阶段有没有 throw"
   *    真正的端口 commit 由 onOutput 在任意时刻异步触发
   */
  /**
   * @param forceManual true 表示用户手动点了"执行"按钮，commit 时忽略指纹排重强推到下游。
   *                    默认 false（自动运行场景），走正常指纹比对。
   */
  run(forceManual: boolean = false): void {
    const body = this.code.trim()
    if (!body) return
    if (this.status === 'running') return

    this.beginRun()
    this.status = 'running'
    this.errorText = ''
    this.resultText = ''
    // 执行期内所有 callOutputPort 触发的 commit 摘要暂存区
    this._runBuffer = []
    this.notifyChanged()

    // 组装 args：端口变量名 → 原始值（Value 子类解包；缺值跳过）
    const args: Record<string, unknown> = {}
    for (let i = 0; i < this.inputMetas.length; i++) {
      const meta = this.inputMetas[i]!
      const port = this.myInputPorts[i]
      if (!port) continue
      const [first] = port.value
      if (first !== undefined) {
        args[meta.name] = this.unwrapValue(first)
      }
    }

    // 每次 callOutputPort 触发 → 即时 commit + 更新结果展示
    const onOutput = (name: string, raw: unknown): void => {
      const found = this.findOutputPortByName(name)
      if (!found) {
        this._runBuffer.push(`⚠ ${name}（端口不存在）`)
        this._flushRunBuffer()
        return
      }
      try {
        if (raw === null || raw === undefined) {
          // null / undefined → commit 该类型的 null Value（单通道信号，沿 edges 正常派发）
          const nullVal = this.coerceNull(found.meta.kind)
          found.port.commit(nullVal, { force: forceManual })
          this._runBuffer.push(`${name} = （null）`)
        } else {
          const v = this.coerce(raw, found.meta.kind)
          found.port.commit(v, { force: forceManual })
          this._runBuffer.push(`${name}=${v.displayLabel}`)
        }
      } catch (err) {
        this._runBuffer.push(`⚠ ${name}: ${err instanceof Error ? err.message : String(err)}`)
      }
      this._flushRunBuffer()
    }

    // @ts-ignore — preload Window 扩展在 tsconfig.renderer.json，本文件走 tsconfig.node.json 编译，
    // 但运行时本文件只在 renderer 里执行，window.codeApi 一定存在
    const api = window.codeApi

    let resp: ReturnType<typeof api.run>
    try {
      resp = api.run(
        this.code,
        args,
        onOutput,
        (msg: string) => {
          // async 函数里 throw / Promise reject → preload 侧 catch 到后回调这里
          // 可能跟 _flushRunBuffer 竞争：如果已经有 callOutputPort 提交过值，status 可能是 done
          // 覆盖 resultText 成错误信息，并确保 status = error
          this.resultText = ''
          this.errorText = msg
          this.status = 'error'
          this.failRun()
          this.notifyChanged()
        },
        () => {
          // async 函数 resolve → preload 侧通知"函数体跑完了"
          // 如果状态还是 running（说明既没有 callOutputPort 也没有 onError），收口为 done
          if (this.status === 'running') {
            this.status = 'done'
            this.resultText = '（执行完成，无输出）'
          }
          // 不管 status 是什么，执行到这里 = run 结束 → completeRun
          this.completeRun()
          this.notifyChanged()
        }
      )
    } catch (err) {
      resp = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }

    if (!resp.ok) {
      this.resultText = ''
      this.errorText = resp.error ?? '执行失败'
      this.status = 'error'
      this.failRun() // 同步执行期的 API 层错误，run 没开始就结束了
      this.notifyChanged()
      return
    }

    // 同步执行正常结束。
    // 有 callOutputPort → _flushRunBuffer 已经把状态改成 done
    // 无 callOutputPort 但函数是同步的（如 console.log）→ Promise 会在同一个 tick 内 resolve，
    //   onComplete 会紧接着触发并收口状态
    // 无 callOutputPort 但函数在 await → Promise 等 await 完才 resolve，onComplete 到时收口
    // 这里什么都不用做，等 onComplete 或 _flushRunBuffer 来收口
  }

  /** 一次 run() 执行期内，所有 onOutput 回调的 commit 摘要暂存区。 */
  private _runBuffer: string[] = []

  /** 把 _runBuffer 刷进 resultText 并刷新 UI；每有一次 callOutputPort 触发就会调一次 */
  private _flushRunBuffer(): void {
    if (this._runBuffer.length === 0) return
    this.resultText = this._runBuffer.join('\n')
    if (this.status === 'running') {
      this.status = 'done'
    }
    this.notifyChanged()
  }

  /** 任一输入端口值变化 → 通知渲染层刷新 + 若开了自动执行则跑一次 */
  inputPortReceiveValue(_ports: InputPort[]): void {
    this.notifyChanged()
    if (this.autoRunEnabled) {
      setTimeout(() => {
        void this.run()
      }, 0)
    }
  }

  // —— 内部：值解包 & 包装 ——

  /**
   * 把 Value 子类解包成 JS 原始值 / File，供用户代码直接使用。
   */
  private unwrapValue(v: unknown): unknown {
    if (v instanceof NumberValue) return v.value
    if (v instanceof StringValue) return v.value
    if (v instanceof BoolValue) return v.value
    if (v instanceof JsonValue) return v.value
    if (v instanceof FileValue) return v.file
    return v
  }

  /** 把 preload 回传的原始返回值按指定端口类型包装成 Value */
  private coerce(raw: unknown, kind: CodePortKind): Value {
    switch (kind) {
      case 'number': {
        const n = Number(raw)
        if (!Number.isFinite(n)) {
          throw new Error(`返回值无法转为数字：${String(raw)}`)
        }
        return new NumberValue(n)
      }
      case 'bool':
        return new BoolValue(Boolean(raw))
      case 'json': {
        // 接受对象/数组/原始值直接包 JsonValue；字符串尝试 JSON.parse
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        return new JsonValue(parsed)
      }
      case 'file': {
        if (!(raw instanceof File)) {
          throw new Error(`需要 File 对象，实际收到 ${typeof raw}`)
        }
        return new FileValue(raw, djb2(raw.name))
      }
      case 'imgfile': {
        if (!(raw instanceof File)) {
          throw new Error(`需要 File 对象（图片），实际收到 ${typeof raw}`)
        }
        return new ImgFileValue(raw, djb2(raw.name))
      }
      case 'string':
      default:
        return new StringValue(String(raw))
    }
  }

  /**
   * 按端口 kind 构造对应的 null Value（isNull=true）。
   * 所有子类构造函数不传参即为 null 状态（value === undefined → super(value === undefined) → isNull=true）。
   * 单通道模型：null 值和正常值都走 commit，不再需要 clear 旁路。
   */
  private coerceNull(kind: CodePortKind): Value {
    switch (kind) {
      case 'number':  return new NumberValue()
      case 'bool':    return new BoolValue()
      case 'json':    return new JsonValue()
      case 'file':    return new FileValue()
      case 'imgfile': return new ImgFileValue()
      case 'string':
      default:        return new StringValue()
    }
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      code: this.code,
      inputs: this.inputMetas,
      outputs: this.outputMetas,
      autoRun: this.autoRunEnabled,
      collapsed: this.collapsed
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.code === 'string') {
      this.code = state.code
    }

    if (typeof state.autoRun === 'boolean') {
      this.autoRunEnabled = state.autoRun
    }

    if (typeof state.collapsed === 'boolean') {
      this.collapsed = state.collapsed
    }

    // —— 恢复输入端口 ——
    for (const port of this.myInputPorts) {
      super.removeInput(port)
    }
    this.myInputPorts = []
    this.inputMetas = []

    const savedInputs = state.inputs
    if (Array.isArray(savedInputs)) {
      for (const entry of savedInputs) {
        const obj = entry as Record<string, unknown>
        if (
          typeof obj.id === 'string' &&
          typeof obj.name === 'string' &&
          typeof obj.kind === 'string' && INPUT_KINDS.includes(obj.kind as CodeInputKind)
        ) {
          const meta: CodeInputMeta = { id: obj.id, name: obj.name, kind: obj.kind as CodeInputKind }
          this.inputMetas.push(meta)
          const port = this.buildInputPort(meta)
          this.myInputPorts.push(port)
          super.addInput(port)
        }
      }
    }

    // —— 恢复输出端口 ——
    for (const port of this.myOutputPorts) {
      super.removeOutput(port)
    }
    this.myOutputPorts = []
    this.outputMetas = []

    const savedOutputs = state.outputs
    if (Array.isArray(savedOutputs)) {
      for (const entry of savedOutputs) {
        const obj = entry as Record<string, unknown>
        if (
          typeof obj.id === 'string' &&
          typeof obj.name === 'string' &&
          typeof obj.kind === 'string' && ALL_PORT_KINDS.includes(obj.kind as CodePortKind)
        ) {
          const meta: CodeOutputMeta = { id: obj.id, name: obj.name, kind: obj.kind as CodePortKind }
          this.outputMetas.push(meta)
          const port = this.buildOutputPort(meta)
          this.myOutputPorts.push(port)
          super.addOutput(port)
        }
      }
    }

    // —— 兼容旧版：有 returnKind 但没有 outputs 数组时，创建一个默认输出端口 ——
    if (this.outputMetas.length === 0) {
      const returnKind = state.returnKind
      const kind: CodePortKind = (typeof returnKind === 'string' && ALL_PORT_KINDS.includes(returnKind as CodePortKind))
        ? returnKind as CodePortKind
        : 'number'
      const meta: CodeOutputMeta = {
        id: `out-legacy-${Date.now()}`,
        name: 'result',
        kind
      }
      this.outputMetas.push(meta)
      const port = this.buildOutputPort(meta)
      this.myOutputPorts.push(port)
      super.addOutput(port)
    }

    // —— 最后：端口都恢复完了，根据端口数量设 box 高度（永远按折叠态算） ——
    this.setBox(NODE_WIDTH, computeBoxHeight(this.inputMetas.length, this.outputMetas.length))

    this.notifyChanged()
  }
}
