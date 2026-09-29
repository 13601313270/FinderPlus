import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** 命令执行状态：UI 据此决定按钮可点/结果区样式 */
export type CommandStatus = 'idle' | 'running' | 'done' | 'error'

/**
 * 命令行节点：把一条常用 shell 命令**保存**在节点里，之后点「执行」按钮即可重复运行，
 * 免去每次手动敲命令。编辑命令走节点的设置面板（齿轮），主视图只展示最终要跑的命令。
 *
 * 命令是**模板**：用 $1 $2 $3 … 引用第 N 个字符串输入端口的值，拼出最终命令再执行
 * （仿 StringConcatNode）。端口由用户手动增删，编号始终连续：第 N 个端口就对应 $N。
 * 模板变化、任一输入到达时即时重算，主视图展示的就是这份「生成的命令字符串」。
 *
 * 输出端口把执行结果（成功时为 stdout，失败时为 stderr）以字符串发往下游。
 * 真正的执行在主进程（child_process.exec），渲染进程只经 preload 的 commandApi 转发，
 * 节点保持对 Electron 的透明（同 FileNode 的处理方式）。
 */
export class CommandNode extends Node {
  static readonly TYPE = 'command'
  readonly type = CommandNode.TYPE

  /** 输出端口：执行结果字符串 */
  readonly textOutput = new OutputPort('text', StringValue, '输出')

  /** 命令名称（用于辨识这条命令是干什么的，持久化） */
  private name = ''

  /** 命令模板（含 $N 占位符，持久化） */
  private template = ''

  /** 按模板 + 当前输入值生成的最终命令（UI 展示、执行时都用它） */
  private resolvedCommand = ''

  /** 端口 id 自增序号，保证 id 唯一（与 $N 的编号无关） */
  private portSeq = 0

  /** 上次执行的输出（派生状态，不持久化） */
  private stdout = ''
  private stderr = ''
  private status: CommandStatus = 'idle'

  constructor(id: string) {
    super(id)
    this.addOutput(this.textOutput)
    // 默认给一个输入端口，方便直接开用
    this.addInputPort()
    // 内容区硬约束：手柄 + 名称行 + 命令预览 + 端口控制栏 + 结果区 + 执行按钮
    this.setBox(340, 280)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  // —— 渲染层读的状态 ——

  /** 命令名称（节点内联输入框展示，可能为空） */
  get displayName(): string {
    return this.name
  }

  /** 命令模板原文（设置面板编辑用） */
  get displayTemplate(): string {
    return this.template
  }

  /** 生成的最终命令（主视图展示、执行时都用它） */
  get displayCommand(): string {
    return this.resolvedCommand
  }

  /** 当前输入端口数量 */
  get inputCount(): number {
    return this.inputPorts.length
  }

  get displayStdout(): string {
    return this.stdout
  }

  get displayStderr(): string {
    return this.stderr
  }

  get displayStatus(): CommandStatus {
    return this.status
  }

  // —— 用户操作 ——

  /** 保存命令名称；节点内联名称输入框 change 时调用 */
  setName(text: string): void {
    if (text === this.name) return
    this.name = text
    this.notifyChanged()
  }

  /** 保存命令模板；设置面板点「保存」时调用，改完立即重算 */
  setTemplate(text: string): void {
    if (text === this.template) return
    this.template = text
    this.recompute()
    this.notifyChanged()
  }

  /** 追加一个输入端口，编号接在当前末尾之后 */
  addInputPort(): void {
    this.portSeq += 1
    const port = new InputPort(`p${this.portSeq}`, {
      accepts: [StringValue],
      label: `$${this.inputPorts.length + 1}`
    })
    // addInput 内部会 notifyChanged，端口列表据此刷新
    this.addInput(port)
    this.recompute()
  }

  /** 移除末尾的输入端口；断开其上的连线 */
  removeLastInputPort(): void {
    const last = this.inputPorts[this.inputPorts.length - 1]
    if (!last) return
    this.removeInput(last)
    this.recompute()
  }

  /** 任一输入到达 → 重算最终命令并刷新视图 */
  inputPortReceiveValue(_ports: InputPort[]): void {
    this.recompute()
    this.notifyChanged()
  }

  /**
   * 按模板替换 $N 生成最终命令。
   * 缺值 / 无对应端口时该占位符替换为空串。
   * `$$` 为转义，替换成字面量 `$`（如 `$$1` → `$` + 第 1 个端口值）。
   */
  private recompute(): void {
    this.resolvedCommand = this.template.replace(/\$\$|\$(\d+)/g, (_match, digits?: string) => {
      // 命中 $$：输出字面量 $
      if (digits === undefined) return '$'
      const index = Number(digits) - 1
      const port = this.inputPorts[index]
      if (!port) return ''
      const [first] = port.value
      return first instanceof StringValue ? first.value : ''
    })
  }

  /** 执行当前命令（用生成的最终命令）；UI 的「执行」按钮点击时调用 */
  async run(): Promise<void> {
    const command = this.resolvedCommand.trim()
    if (!command) return
    // 上一次还没跑完就不重复触发（按钮此时也是禁用的，双保险）
    if (this.status === 'running') return

    this.status = 'running'
    this.stdout = ''
    this.stderr = ''
    this.notifyChanged()

    let result: { stdout: string; stderr: string; code: number }
    try {
      // @ts-ignore — tsconfig.node.json 编译本文件时不把 preload 的 Window 扩展带进来，
      // 但运行时本文件只在 renderer 里执行，window.commandApi 一定存在
      result = await window.commandApi.run(command)
    } catch (err) {
      result = { stdout: '', stderr: err instanceof Error ? err.message : String(err), code: 1 }
    }

    this.stdout = result.stdout
    this.stderr = result.stderr
    // 成功发 stdout，失败发 stderr，下游拿到的是这次执行的文本结果
    const text = result.code === 0 ? result.stdout : result.stderr
    this.textOutput.commit(new StringValue(text))
    this.status = result.code === 0 ? 'done' : 'error'
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    return {
      name: this.name,
      template: this.template,
      // 端口数量：恢复时按此重建端口，边才能重新接上
      inputCount: this.inputPorts.length
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.name === 'string') {
      this.name = state.name
    }
    if (typeof state.template === 'string') {
      this.template = state.template
    }
    // 按存储的端口数量重建端口（构造时已有 1 个，先清干净再重建）
    const wanted = typeof state.inputCount === 'number' ? Math.max(1, Math.floor(state.inputCount)) : this.inputPorts.length
    while (this.inputPorts.length > 0) {
      this.removeLastInputPort()
    }
    for (let i = 0; i < wanted; i += 1) {
      this.addInputPort()
    }
    this.recompute()
    this.notifyChanged()
  }
}