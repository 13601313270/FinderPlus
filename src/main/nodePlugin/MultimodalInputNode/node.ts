import type { Edge } from '../../engine/graph/Edge'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { StringValue } from '../../engine/data/StringValue'
import { MultiModalValue, type MultiModalPart } from '../../engine/data/MultiModalValue'

const DEFAULT_BOX: [number, number] = [320, 240]
const MIN_WIDTH = 200
const MIN_HEIGHT = 140

/**
 * 多模态输入节点：源头节点。
 * 框里写文字 + 选图片 → commit MultiModalValue 到输出端口。
 *
 * 和 TextInputNode 的区别：TextInput 只输出 StringValue，
 * 本节点输出 MultiModalValue（可以同时携带 text + image parts）。
 * 没有图片时，相当于 TextInputNode。
 */
export class MultimodalInputNode extends Node {
  static readonly TYPE = 'multimodal-input'
  readonly type = MultimodalInputNode.TYPE

  readonly setInput = new InputPort('set', {
    accepts: [StringValue],
    label: { zh: '外部文本', en: 'Set Text' }
  })

  readonly multimodalOutput = new OutputPort('out', MultiModalValue, {
    zh: '多模态',
    en: 'Multimodal'
  })

  /** 草稿 parts：text 存 string，image 存 File（File 不持久化） */
  private parts: MultiModalPart[] = []

  private autoSend = false

  constructor(id: string) {
    super(id)
    this.addInput(this.setInput)
    this.addOutput(this.multimodalOutput)
    const [w, h] = DEFAULT_BOX
    this.setBox(w, h)
  }

  isPositionAcceptFileDrop(_x: number, _y: number): boolean { return false }
  onFileDrop(_p: string): void {}

  /** UI 读：当前 text 内容拼接 */
  get text(): string {
    return this.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text).join('\n')
  }

  /** UI 读：当前 File 列表 */
  get imageFiles(): File[] {
    return this.parts
      .filter((p): p is { type: 'image'; file: File } => p.type === 'image')
      .map(p => p.file)
  }

  get isAutoSend(): boolean { return this.autoSend }

  toggleAutoSend(): void {
    this.autoSend = !this.autoSend
    this.notifyChanged()
  }

  setText(text: string): void {
    // 重置 parts 里所有 text，image 保留
    const imgs = this.parts.filter(p => p.type === 'image')
    const newParts: MultiModalPart[] = []
    if (text.trim()) newParts.push({ type: 'text', text })
    newParts.push(...imgs)
    this.parts = newParts
    this.notifyChanged()
  }

  /** UI 加图片：push 到 parts 里 */
  addImage(file: File): void {
    this.parts.push({ type: 'image', file })
    this.notifyChanged()
  }

  /** UI 删图片 */
  removeImage(index: number): void {
    // index 是 image 槽位序号，但 parts 里 text 和 image 混排
    // 所以先找到第 index 个 image 的实际位置
    let imgCount = 0
    for (let i = 0; i < this.parts.length; i++) {
      if (this.parts[i].type === 'image') {
        if (imgCount === index) {
          this.parts.splice(i, 1)
          this.notifyChanged()
          return
        }
        imgCount++
      }
    }
  }

  commitMm(force = false): void {
    this.multimodalOutput.commit(new MultiModalValue(this.parts), { force })
  }

  resizeBox(width: number, height: number): void {
    this.setBox(Math.max(MIN_WIDTH, Math.round(width)), Math.max(MIN_HEIGHT, Math.round(height)))
  }

  inputPortReceiveValue(_ports: InputPort[], _source: 'receive' | 'receiveClear' | 'bindEdge' | 'unbindEdge'): void {
    const [first] = this.setInput.value
    if (first === undefined) {
      this.completeRun()
      return
    }
    if (first instanceof StringValue) {
      this.setText(first.isNull ? '' : (first.value ?? ''))
      if (this.autoSend) this.commitMm()
    }
    this.completeRun()
  }

  onOutputPortBind(_op: OutputPort, _edge: Edge): void {
    if (this.autoSend) this.commitMm(true)
  }

  saveState(): Record<string, unknown> {
    const [w, h] = this.box
    return {
      ...super.saveState(),
      // File 不持久化，只存 text + image count 元信息
      text: this.text,
      imageCount: this.imageFiles.length,
      autoSend: this.autoSend,
      width: w,
      height: h
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)
    if (state.autoSend === true) this.autoSend = true
    if (typeof state.width === 'number' && typeof state.height === 'number') {
      this.setBox(state.width, state.height)
    }
    const text = typeof state.text === 'string' ? state.text : ''
    const parts: MultiModalPart[] = []
    if (text.trim()) parts.push({ type: 'text', text })
    this.parts = parts
    this.notifyChanged()
    this.multimodalOutput.commit(new MultiModalValue(parts))
  }
}
