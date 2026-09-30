import { BoolValue } from '../../engine/data/BoolValue'
import { djb2 } from '../../engine/data/hash'
import { FileValue } from '../../engine/data/FileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { Value } from '../../engine/data/Value'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** 可选的返回类型：决定输出端口挂哪种 Value，也决定结果怎么包装 */
export type CodeReturnKind = 'number' | 'string' | 'bool' | 'file' | 'imgfile'

/** 可选的输入类型：决定 InputPort.accepts 覆盖哪些 Value 子类 */
export type CodeInputKind = 'number' | 'string' | 'bool' | 'file'

/** 返回类型 → Value 子类（输出端口与结果包装共用这一处真相） */
const KIND_CLASSES = {
  number: NumberValue,
  string: StringValue,
  bool: BoolValue,
  file: FileValue,
  imgfile: ImgFileValue
} as const

/**
 * 输入类型 → InputPort.accepts 数组。
 * file 用 FileValue（原型链覆盖 ImgFileValue / TxtFileValue）。
 * 非抽象类，所以能进 InputPort.accepts。
 */
const INPUT_KIND_ACCEPTS: Record<CodeInputKind, readonly InputPortOptionsAcc[]> = {
  number: [NumberValue],
  string: [StringValue],
  bool: [BoolValue],
  file: [FileValue]
}

/** InputPort 构造器 accepts 参数所需的 Value 子类类型（供上面的 Record 签名复用） */
type InputPortOptionsAcc = NonNullable<ConstructorParameters<typeof InputPort>[1]['accepts']>[number]

/** 执行状态：UI 据此决定按钮可点 / 结果区样式 */
export type CodeStatus = 'idle' | 'running' | 'done' | 'error'

const NODE_HEIGHT = 400

/** 输入端口的持久化元数据：同步决定端口的 accepts 与 label */
export interface CodeInputMeta {
  /** 端口唯一 id（持久化） */
  id: string
  /** 用户给的变量名（合法 JS 标识符，函数体里直接用它） */
  name: string
  /** 类型：决定 InputPort.accepts 覆盖哪些 Value 子类 */
  kind: CodeInputKind
}

/**
 * 代码节点：把一段 JS 函数体存在节点里，点「执行」跑一次，结果按选定的返回类型发往下游。
 *
 * - 代码只写函数体，自己用 return 返回结果；执行在 preload 侧（主进程已移走），
 *   preload 是 Node 环境 + 共享 renderer 内存，File 对象直接传，new Function 不受 CSP 限制。
 * - 返回类型（number / string / bool）由用户选，切类型就重建输出端口：旧端口连同下游边
 *   一起断掉，新端口挂对应的 Value 子类。
 * - 输入端口由用户动态增删、自定义变量名 + 类型：
 *   - number → 原始数字，string → 原始字符串，bool → 原始布尔
 *   - file → 浏览器 File 对象（accepts FileValue，原型链覆盖图片/文本子类）
 *   - 切换类型会重建端口、断旧边（和 setReturnKind 行为对称）。
 */
export class CodeNode extends Node {
  static readonly TYPE = 'code'
  readonly type = CodeNode.TYPE

  /** 当前返回类型（持久化） */
  private returnKindValue: CodeReturnKind = 'number'

  /** 函数体（持久化） */
  private code = ''

  /** 输入端口元数据（持久化）：同步更新 myInputPorts */
  private inputMetas: CodeInputMeta[] = []

  /** 运行时输入端口列表：与 inputMetas 一一对应（不同于 Node 基类的 inputPorts getter） */
  private myInputPorts: InputPort[] = []

  /** 输出端口：随 returnKindValue 动态重建 */
  private resultOutput: OutputPort | undefined

  /** 上次执行的原始返回值（派生，不持久化）；切类型时用它把新端口的值补上 */
  private lastRawValue: number | string | boolean | File | undefined

  /** 上次结果的展示文本 / 错误文本（派生，不持久化） */
  private resultText = ''
  private errorText = ''
  private status: CodeStatus = 'idle'

  /** 自动执行开关（持久化）：打开后每次输入端口收到值都会自动跑一次 run() */
  private autoRunEnabled = false

  constructor(id: string) {
    super(id)
    this.rebuildOutputPort()
    // 内容区硬约束：手柄 + 输入端口列表 + 代码编辑区 + 返回类型 + 结果区 + 执行按钮
    this.setBox(360, NODE_HEIGHT)
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

  get returnKind(): CodeReturnKind {
    return this.returnKindValue
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

  /** 渲染层读当前输入端口元数据列表（每项含 id / name / kind） */
  get displayInputs(): readonly CodeInputMeta[] {
    return this.inputMetas
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

  // —— 输入端口管理 ——

  /** 合法 JS 标识符：允许字母、数字、$、_，不能以数字开头，不能是保留字 */
  private static JS_IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/
  private static RESERVED = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
    'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if',
    'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw',
    'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'let', 'static', 'yield',
    'arguments', 'await'
  ])

  /** 校验变量名是否合法且未重复。返回错误信息（null 表示通过） */
  validateInputName(name: string, excludeId?: string): string | null {
    const trimmed = name.trim()
    if (!trimmed) return '变量名不能为空'
    if (!CodeNode.JS_IDENT_RE.test(trimmed)) {
      return '变量名必须是合法 JS 标识符（字母/数字/$/_，不能数字开头）'
    }
    if (CodeNode.RESERVED.has(trimmed)) return `不能用保留字 "${trimmed}"`
    const dup = this.inputMetas.find(m => m.name === trimmed && m.id !== excludeId)
    if (dup) return `变量名 "${trimmed}" 已存在`
    return null
  }

  /** 追加一个输入端口，默认类型 number、默认变量名不冲突的 v1/v2/... */
  addCodeInput(): CodeInputMeta {
    let seq = this.inputMetas.length + 1
    let name = `v${seq}`
    while (this.inputMetas.some(m => m.name === name)) {
      seq += 1
      name = `v${seq}`
    }
    const meta: CodeInputMeta = {
      id: `in-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      kind: 'number'
    }
    this.inputMetas.push(meta)
    const port = CodeNode.buildInputPort(meta)
    this.myInputPorts.push(port)
    super.addInput(port)
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
    // 同步更新端口 label，NodeShell 画布上显示的端口名跟着变
    const port = this.myInputPorts.find(p => p.id === id)
    port?.setLabel(trimmed)
    this.notifyChanged()
  }

  /**
   * 修改某个输入端口的类型。
   * 重建端口（accepts 变了旧端口不再合法），流程：
   * 1. 快照当前 myInputPorts 中所有端口对象（旧引用，用来从基类移除——对象 identity 必须匹配）
   * 2. 从基类 inputs 里全部移除（每个都走基类 removeInput 的断边逻辑）
   * 3. 在 myInputPorts[idx] 位置替换成新端口对象
   * 4. 把 myInputPorts 全部重新 addInput 到基类——顺序和基类 inputs 完全对齐
   *
   * 顺序严格：先删旧对象（基类 removeInput 靠 indexOf 匹配对象 identity），再替换引用，再 add 新对象。
   * 如果反过来（先替换再删），新对象不在基类 inputs 里，removeInput 找不到就直接 return，
   * 旧对象留在基类里没被删，加新对象后就会一份变两份。
   */
  setInputKind(id: string, kind: CodeInputKind): void {
    const meta = this.inputMetas.find(m => m.id === id)
    if (!meta || meta.kind === kind) return
    meta.kind = kind

    const idx = this.myInputPorts.findIndex(p => p.id === id)
    if (idx !== -1) {
      // 快照：必须在替换之前拍，拿到 myInputPorts 里原有的对象引用
      const oldPorts = [...this.myInputPorts]
      // 先把所有旧端口从基类移除（对象 identity 必须匹配才能 indexOf 找到）
      for (const p of oldPorts) {
        super.removeInput(p)
      }
      // 替换 myInputPorts 中对应位置成新端口对象
      const newPort = CodeNode.buildInputPort(meta)
      this.myInputPorts[idx] = newPort
      // 再按 myInputPorts 最新顺序逐个 addInput，基类 inputs 就完全对齐了
      for (const p of this.myInputPorts) {
        super.addInput(p)
      }
    }
    this.notifyChanged()
  }

  /** 根据 meta 构造一个新的 InputPort（accepts 由 kind 决定，label 用变量名） */
  private static buildInputPort(meta: CodeInputMeta): InputPort {
    return new InputPort(meta.id, {
      accepts: INPUT_KIND_ACCEPTS[meta.kind] as unknown as ConstructorParameters<typeof InputPort>[1]['accepts'],
      label: meta.name
    })
  }

  // —— 用户操作 ——

  /** 保存函数体；编辑区 input 时调用（不触发执行） */
  setCode(text: string): void {
    if (text === this.code) return
    this.code = text
    this.notifyChanged()
  }

  /** 切换返回类型：重建输出端口挂上对应的 Value 子类 */
  setReturnKind(kind: CodeReturnKind): void {
    if (kind === this.returnKindValue) return
    this.returnKindValue = kind
    this.rebuildOutputPort()
    this.notifyChanged()
  }

  /**
   * 执行当前代码；UI 的「执行」按钮点击时调用。
   *
   * 流程：
   * 1. 从所有输入端口取值、解包成原始值/File、组装成 args 对象
   * 2. 调 window.codeApi.run(body, args)——preload 侧 new Function 执行
   * 3. 结果按当前返回类型包装成 Value 提交到输出端口，失败则记录错误文本
   */
  async run(): Promise<void> {
    const body = this.code.trim()
    if (!body) return
    // 上一次还没跑完就不重复触发（按钮此时也是禁用的，双保险）
    if (this.status === 'running') return

    this.status = 'running'
    this.errorText = ''
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

    let resp: { ok: boolean; value?: number | string | boolean | File; error?: string }
    try {
      // @ts-ignore — tsconfig.node.json 编译本文件时不把 preload 的 Window 扩展带进来，
      // 但运行时本文件只在 renderer 里执行，window.codeApi 一定存在
      resp = await window.codeApi.run(this.code, args)
    } catch (err) {
      resp = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }

    if (!resp.ok) {
      this.resultText = ''
      this.errorText = resp.error ?? '执行失败'
      this.status = 'error'
      this.notifyChanged()
      return
    }

    try {
      // ok:true 时 preload 保证 value 一定存在（要么原始值要么 File）
      // 但 TS 收窄不够精确，加非空断言；真要出 undefined 下一行会抛给外层 catch
      const raw = resp.value as Exclude<typeof resp.value, undefined>
      const value = this.coerce(raw)
      this.resultOutput?.commit(value)
      this.lastRawValue = raw
      this.resultText = value.displayLabel
      this.errorText = ''
      this.status = 'done'
    } catch (err) {
      this.resultText = ''
      this.errorText = err instanceof Error ? err.message : String(err)
      this.status = 'error'
    }
    this.notifyChanged()
  }

  /** 任一输入端口值变化 → 通知渲染层刷新 + 若开了自动执行则跑一次 */
  inputPortReceiveValue(_ports: InputPort[]): void {
    this.notifyChanged()
    if (this.autoRunEnabled) {
      setTimeout(()=>{
        // 异步触发，不阻塞 Node 的端口值分发链路
        void this.run()
      }, 0)
    }
  }

  // —— 内部：值解包 & 端口重建 ——

  /**
   * 把 Value 子类解包成 JS 原始值 / File，供用户代码直接使用。
   * - NumberValue / StringValue / BoolValue → .value
   * - FileValue（及其子类 ImgFileValue / TxtFileValue）→ .file（浏览器 File 对象）
   * - 其它未知 Value 子类 → 原封不动（保底）
   */
  private unwrapValue(v: unknown): unknown {
    if (v instanceof NumberValue) return v.value
    if (v instanceof StringValue) return v.value
    if (v instanceof BoolValue) return v.value
    if (v instanceof FileValue) return v.file
    return v
  }

  /** 保证输出端口的 valueClass 与当前返回类型一致；不一致就拆旧建新 */
  private rebuildOutputPort(): void {
    const valueClass = KIND_CLASSES[this.returnKindValue]
    if (this.resultOutput && this.resultOutput.valueClass === valueClass) return

    if (this.resultOutput) {
      // removeOutput 会连同下游边一起断掉（有 Scene 时）
      this.removeOutput(this.resultOutput)
    }
    this.resultOutput = new OutputPort('result', valueClass, '结果')
    this.addOutput(this.resultOutput)

    // 把上次的原始返回值按新类型补一次，让端口持有 currentValue——
    // 这样之后新连下游时，EdgeBinder.connect 会把已有值立刻补给对方。
    if (this.lastRawValue !== undefined) {
      try {
        this.resultOutput.commit(this.coerce(this.lastRawValue))
      } catch {
        // 旧值不适合新类型（如 "abc" 切到 number）→ 忽略，端口留空
      }
    }
  }

  /** 把 preload 回传的原始返回值按当前返回类型包装成 Value */
  private coerce(raw: number | string | boolean | File): Value {
    switch (this.returnKindValue) {
      case 'number': {
        const n = Number(raw)
        if (!Number.isFinite(n)) {
          throw new Error(`返回值无法转为数字：${String(raw)}`)
        }
        return new NumberValue(n)
      }
      case 'bool':
        return new BoolValue(Boolean(raw))
      case 'file': {
        if (!(raw instanceof File)) {
          throw new Error(`返回值无法转为 File：${typeof raw}（需要 return 一个 File 对象）`)
        }
        return new FileValue(raw, djb2(raw.name))
      }
      case 'imgfile': {
        if (!(raw instanceof File)) {
          throw new Error(`返回值无法转为图片 File：${typeof raw}（需要 return 一个 File 对象）`)
        }
        return new ImgFileValue(raw, djb2(raw.name))
      }
      case 'string':
      default:
        return new StringValue(String(raw))
    }
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      code: this.code,
      returnKind: this.returnKindValue,
      inputs: this.inputMetas,
      autoRun: this.autoRunEnabled
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.code === 'string') {
      this.code = state.code
    }
    const kind = state.returnKind
    if (kind === 'number' || kind === 'string' || kind === 'bool' || kind === 'file' || kind === 'imgfile') {
      this.returnKindValue = kind
    }
    // 按恢复后的类型对齐输出端口
    this.rebuildOutputPort()

    // 恢复输入端口列表（先清干净再按持久化重建，确保端口 id / 元数据一致）
    for (const port of this.myInputPorts) {
      super.removeInput(port)
    }
    this.myInputPorts = []
    this.inputMetas = []

    if (typeof state.autoRun === 'boolean') {
      this.autoRunEnabled = state.autoRun
    }

    const savedInputs = state.inputs
    if (Array.isArray(savedInputs)) {
      for (const entry of savedInputs) {
        const obj = entry as Record<string, unknown>
        if (
          typeof obj.id === 'string' &&
          typeof obj.name === 'string' &&
          (obj.kind === 'number' || obj.kind === 'string' || obj.kind === 'bool' || obj.kind === 'file')
        ) {
          const meta: CodeInputMeta = { id: obj.id, name: obj.name, kind: obj.kind }
          this.inputMetas.push(meta)
          const port = CodeNode.buildInputPort(meta)
          this.myInputPorts.push(port)
          super.addInput(port)
        }
      }
    }
    this.notifyChanged()
  }
}
