import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/**
 * 字符串拼接节点：把若干个字符串输入按模板拼成一条新字符串。
 *
 * - 模板里用 $1 $2 $3 … 引用第 N 个输入端口的值，拼接后从输出端口送出；
 *   需要字面量 `$` 时写 `$$`。
 * - 端口由用户手动增删（addInputPort 追加 / removeLastInputPort 移除末尾），
 *   编号始终连续：第 N 个端口就对应模板里的 $N。
 * - 模板变化、任一输入到达时自动重算并 commit 到输出端口，实时联动下游。
 *
 * 端口编号用「位置」而非固定 id：模板 $N 映射到第 N 个输入端口（从 1 开始）。
 * 因此端口 id 只需唯一，用 p<序号> 递增生成即可，不参与 $N 的解析。
 */
export class StringConcatNode extends Node {
  static readonly TYPE = 'string-concat'
  readonly type = StringConcatNode.TYPE

  /** 输出端口：拼接结果 */
  readonly textOutput = new OutputPort('text', StringValue, {
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
  })

  /** 模板字符串 */
  private template = ''

  /** 已计算出的拼接结果（UI 展示用） */
  private result = ''

  /** 端口 id 自增序号，保证 id 唯一（与 $N 的编号无关） */
  private portSeq = 0

  constructor(id: string) {
    super(id)
    this.addOutput(this.textOutput)
    // 默认给一个输入端口，方便直接开用
    this.addInputPort()
    // 内容区硬约束：手柄 + 模板框 + 底部端口控制栏 + 结果预览
    this.setBox(260, 200)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  // —— 渲染层读的状态 ——

  /** 当前模板内容 */
  get templateText(): string {
    return this.template
  }

  /** 当前拼接结果 */
  get displayResult(): string {
    return this.result
  }

  /** 当前输入端口数量 */
  get inputCount(): number {
    return this.inputPorts.length
  }

  // —— 用户操作 ——

  /** 修改模板：更新后立即重算 */
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
      accepts: [StringValue, NumberValue],
      label: { zh: `$${this.inputPorts.length + 1}`, en: `$${this.inputPorts.length + 1}` }
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

  // —— 重算 ——

  /** 任一输入到达 → 重算并刷新视图 */
  inputPortReceiveValue(_ports: InputPort[]): void {
    this.recompute()
    this.notifyChanged()
    // 同步节点：重算 + commit 输出就算消化完输入 → 回 stable
    this.completeRun()
  }

  /**
   * 按模板替换 $N 并 commit 到输出端口。
   * 缺值 / 无对应端口时该占位符替换为空串。
   * `$$` 为转义，替换成字面量 `$`（如 `$$1` → `$` + 第 1 个端口值）。
   */
  private recompute(): void {
    const text = this.template.replace(/\$\$|\$(\d+)/g, (_match, digits: string | undefined) => {
      // 命中 $$：输出字面量 $
      if (digits === undefined) return '$'
      const index = Number(digits) - 1
      const port = this.inputPorts[index]
      if (!port) return ''
      const [first] = port.value
      if (!first || first.isNull) return ''
      if (first instanceof StringValue) return first.value!
      if (first instanceof NumberValue) return String(first.value)
      return ''
    })
    this.result = text
    this.textOutput.commit(new StringValue(text))
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      template: this.template,
      // 端口数量：恢复时按此重建端口，边才能重新接上
      inputCount: this.inputPorts.length,
      // 用户 resize 后的内容区宽高；未 resize 时即构造时的默认 box
      box: this.box as readonly [number, number]
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.template === 'string') {
      this.template = state.template
    }
    // 恢复用户调整过的尺寸（老数据缺该字段时保留默认 box）
    const box = state.box
    if (Array.isArray(box) && box.length === 2 && box.every((v) => typeof v === 'number')) {
      this.setBox(box[0], box[1])
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