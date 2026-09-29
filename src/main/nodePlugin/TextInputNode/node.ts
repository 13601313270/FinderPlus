import { StringValue } from '../../engine/data/StringValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'

const SINGLE_LINE_HEIGHT = 119
const MULTI_LINE_HEIGHT = 169

/**
 * 字符串输入框节点：源头节点，框里写什么就往外送什么。
 * 没有输入端口，只有一个字符串输出。
 */
export class TextInputNode extends Node {
  static readonly TYPE = 'text-input'
  readonly type = TextInputNode.TYPE

  /** 输出端口：字符串 */
  readonly textOutput = new OutputPort('text', StringValue, '文本')

  private content = ''

  /** 是否为多行输入模式 */
  private multiline = false

  /** 是否自动发送：开启后停止输入即自动 commit，发送按钮随之置灰 */
  private autoSend = false

  constructor(id: string) {
    super(id)
    this.addOutput(this.textOutput)
    // 内容区硬约束：手柄 + 输入框 + padding ≈ 86px 高，宽 220px
    this.setBox(220, SINGLE_LINE_HEIGHT)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 框里的内容（草稿），UI 直接读它 */
  get text(): string {
    return this.content
  }

  /** 是否多行输入，UI 读它决定渲染 input 还是 textarea */
  get isMultiline(): boolean {
    return this.multiline
  }

  /** 是否自动发送，UI 读它决定开关状态与发送按钮是否置灰 */
  get isAutoSend(): boolean {
    return this.autoSend
  }

  /** 切换自动发送开关 */
  toggleAutoSend(): void {
    this.autoSend = !this.autoSend
    this.notifyChanged()
  }

  /** 切换单行/多行模式，同时调整节点 box 高度 */
  toggleMultiline(): void {
    this.multiline = !this.multiline
    this.setBox(220, this.multiline ? MULTI_LINE_HEIGHT : SINGLE_LINE_HEIGHT)
    // 切回单行时，把草稿里的换行符清掉（\r\n 和 \n 都要处理），同时同步到输出端口
    if (!this.multiline && this.content.includes('\n')) {
      this.content = this.content.replace(/\r?\n/g, ' ')
      this.textOutput.commit(new StringValue(this.content))
      this.notifyChanged()
    }
  }

  /**
   * 设置草稿内容（仅更新输入框显示，不触发输出端口 commit）。
   * 用户在输入框里敲字时调这个——草稿值和输出值分离。
   */
  setText(text: string): void {
    if (text === this.content) return
    this.content = text
    this.notifyChanged() // 触发持久化 + render.vue 里的草稿刷新
  }

  /** 把当前草稿值提交到输出端口，下游节点才会收到 */
  commitText(): void {
    this.textOutput.commit(new StringValue(this.content))
    // commit 内部不触发 notifyChanged——提交是瞬时事件，不需要持久化
  }

  /** 没有输入端口，永远收不到通知 */
  inputPortReceiveValue(_ports: InputPort[]): void {}

  saveState(): Record<string, unknown> {
    return { content: this.content, multiline: this.multiline, autoSend: this.autoSend }
  }

  readState(state: Record<string, unknown>): void {
    // 恢复多行模式 → 调整 box 高度
    if (state.multiline === true) {
      this.multiline = true
      this.setBox(220, MULTI_LINE_HEIGHT)
    }
    if (state.autoSend === true) {
      this.autoSend = true
    }
    // 恢复草稿值
    const text = typeof state.content === 'string' ? state.content : ''
    this.content = text
    this.notifyChanged()
    // 恢复源头值 → 触发 commit，下游才能收到（之前 setText 自带 commit，现在要显式调）
    this.textOutput.commit(new StringValue(text))
  }
}