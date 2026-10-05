import { StringValue } from '../../engine/data/StringValue'
import type { Edge } from '../../engine/graph/Edge'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'

/** 构造默认 box（多行输入）；用户拖拽调整后以 setBox 为准 */
const DEFAULT_BOX: [number, number] = [300, 180]

/** 内容区最小尺寸：再小就没地方放输入框了 */
const MIN_WIDTH = 180
const MIN_HEIGHT = 80

/**
 * 字符串输入框节点：源头节点，框里写什么就往外送什么。
 * 没有输入端口，只有一个字符串输出。
 * 永远是多行 textarea，支持右下角拖拽调整宽高，尺寸持久化到 saveState。
 */
export class TextInputNode extends Node {
  static readonly TYPE = 'text-input'
  readonly type = TextInputNode.TYPE

  /** 输出端口：字符串 */
  readonly textOutput = new OutputPort('text', StringValue, {
    zh: '文本',
    en: 'Text',
    ja: 'テキスト',
    ko: '텍스트',
    es: 'Texto',
    ar: 'نص',
    fr: 'Texte',
    pt: 'Texto',
    ru: 'Текст',
    hi: 'पाठ',
    id: 'Teks',
    de: 'Text',
    vi: 'Văn bản',
    tr: 'Metin',
    it: 'Testo'
  })

  private content = ''

  /** 是否自动发送：开启后停止输入即自动 commit，发送按钮随之置灰 */
  private autoSend = false

  constructor(id: string) {
    super(id)
    this.addOutput(this.textOutput)
    const [w, h] = DEFAULT_BOX
    this.setBox(w, h)
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

  /** 是否自动发送，UI 读它决定开关状态与发送按钮是否置灰 */
  get isAutoSend(): boolean {
    return this.autoSend
  }

  /** 当前内容区 box，UI 读它决定节点尺寸（render.vue 内部拖拽调整后会自动同步回来） */
  get displayBox(): readonly [number, number] {
    return this.box
  }

  /** 切换自动发送开关 */
  toggleAutoSend(): void {
    this.autoSend = !this.autoSend
    this.notifyChanged()
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

  /** 把当前草稿值提交到输出端口，下游节点才会收到。手动触发传 force，绕过指纹排重 */
  commitText(force = false): void {
    this.textOutput.commit(new StringValue(this.content), { force })
    // commit 内部不触发 notifyChanged——提交是瞬时事件，不需要持久化
  }

  /**
   * UI 拖拽 handle 时调这个——把 box 夹到最小尺寸之上。
   * Node.setBox 内部有 Math.max(0) 但没有 MIN 的语义，这里做一层守护。
   */
  resizeBox(width: number, height: number): void {
    this.setBox(Math.max(MIN_WIDTH, Math.round(width)), Math.max(MIN_HEIGHT, Math.round(height)))
  }

  /** 没有输入端口，永远收不到通知 */
  inputPortReceiveValue(_ports: InputPort[], _source: 'receive' | 'receiveClear' | 'bindEdge' | 'unbindEdge'): void {}

  /**
   * 新连线接上时：auto-send 开启则立即 commit 当前草稿值给所有边（force=true 跳过排重，
   * 确保新连线能收到）；关闭则什么都不做，等用户手动点发送——覆盖基类默认的"有值就补送"。
   */
  onOutputPortBind(_outputPort: OutputPort, _edge: Edge): void {
    if (this.autoSend) {
      this.commitText(true)
    }
  }

  saveState(): Record<string, unknown> {
    const [w, h] = this.box
    return {
      content: this.content,
      autoSend: this.autoSend,
      width: w,
      height: h
    }
  }

  readState(state: Record<string, unknown>): void {
    if (state.autoSend === true) {
      this.autoSend = true
    }
    // 恢复 box 尺寸（优先用存的值；老数据没有就用默认）
    if (typeof state.width === 'number' && typeof state.height === 'number') {
      this.setBox(state.width, state.height)
    } else {
      const [dw, dh] = DEFAULT_BOX
      this.setBox(dw, dh)
    }
    // 老数据存了 multiline + 单行换行符清理，这里已经永远是 textarea 了，不处理它
    const text = typeof state.content === 'string' ? state.content : ''
    this.content = text
    this.notifyChanged()
    this.textOutput.commit(new StringValue(text))
  }
}