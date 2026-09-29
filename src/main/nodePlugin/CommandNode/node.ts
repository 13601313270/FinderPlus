import { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'

/** 命令执行状态：UI 据此决定按钮可点/结果区样式 */
export type CommandStatus = 'idle' | 'running' | 'done' | 'error'

/**
 * 命令行节点：把一条常用 shell 命令**保存**在节点里，之后点「执行」按钮即可重复运行，
 * 免去每次手动敲命令。编辑命令走节点的设置面板（齿轮），主视图只展示已保存的命令。
 *
 * 没有端口——命令是节点自己的参数，执行结果直接显示在节点内。
 * 真正的执行在主进程（child_process.exec），渲染进程只经 preload 的 commandApi 转发，
 * 节点保持对 Electron 的透明（同 FileNode 的处理方式）。
 */
export class CommandNode extends Node {
  static readonly TYPE = 'command'
  readonly type = CommandNode.TYPE

  /** 已保存的命令（持久化，下次打开还在） */
  private command = ''

  /** 上次执行的输出（派生状态，不持久化） */
  private stdout = ''
  private stderr = ''
  private status: CommandStatus = 'idle'

  constructor(id: string) {
    super(id)
    // 内容区硬约束：手柄 + 命令预览 + 结果区 + 执行按钮
    this.setBox(340, 220)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  // —— 渲染层读的状态 ——

  get displayCommand(): string {
    return this.command
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

  /** 保存命令内容；设置面板点「保存」时调用 */
  setCommand(text: string): void {
    if (text === this.command) return
    this.command = text
    this.notifyChanged()
  }

  /** 执行当前命令；UI 的「执行」按钮点击时调用 */
  async run(): Promise<void> {
    const command = this.command.trim()
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
    this.status = result.code === 0 ? 'done' : 'error'
    this.notifyChanged()
  }

  /** 没有输入端口，永远收不到通知 */
  inputPortReceiveValue(_ports: InputPort[]): void {}

  saveState(): Record<string, unknown> {
    return { command: this.command }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.command === 'string') {
      this.command = state.command
    }
    this.notifyChanged()
  }
}