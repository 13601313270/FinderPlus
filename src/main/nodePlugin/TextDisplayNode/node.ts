import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { Node } from '../../engine/node/Node'

/**
 * 字符串展示节点：把上游送来的字符串显示出来。
 * 没有输出端口——它的产出就是「展示」这件事本身，UI 直接读 text。
 */
export class TextDisplayNode extends Node {
  static readonly TYPE = 'text-display'
  readonly type = TextDisplayNode.TYPE

  /** 输入端口：只接受字符串 */
  readonly textInput = new InputPort('text', {
    accepts: [StringValue],
    label: {
      zh: '文本',
      en: 'Text',
      ja: 'テキスト',
      ko: '텍스트',
      es: 'Texto',
      ar: 'نص',
      fr: 'Texte',
      pt: 'Texto',
      ru: 'Текст',
      hi: 'टेक्स्ट',
      id: 'Teks',
      de: 'Text',
      vi: 'Văn bản',
      tr: 'Metin',
      it: 'Testo'
    }
  })

  private displayed = ''

  constructor(id: string) {
    super(id)
    this.addInput(this.textInput)
    // 内容区硬约束：手柄 + 文本展示区。文本可长，超出的部分在框内滚动
    this.setBox(220, 150)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 当前展示的内容。没接输入、或上游还没算过时是空串 */
  get text(): string {
    return this.displayed
  }

  /** 收到通知就刷新展示，这是它唯一要做的事 */
  inputPortReceiveValue(_ports: InputPort[]): void {
    const [first] = this.textInput.value
    this.displayed = first instanceof StringValue ? first.value : ''
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    // displayed 是上游派生出来的，恢复时上游 commit 会自动刷回来，不用存；
    // box（用户拖右下角调整过的大小）是本节点自己的状态，必须存。
    return {
      box: this.box as readonly [number, number]
    }
  }

  readState(state: Record<string, unknown>): void {
    // 恢复用户调整过的尺寸（老数据缺该字段时保留构造时的默认 box）
    const box = state.box
    if (Array.isArray(box) && box.length === 2 && box.every((v) => typeof v === 'number')) {
      this.setBox(box[0], box[1])
    }
    // displayed 等上游恢复后自然会刷新
  }
}