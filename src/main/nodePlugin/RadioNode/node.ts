import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { Value, type ValueKind } from '../../engine/data/Value'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'

/** 输出端口可选的数据类型：枚举节点目前只产出 string / number 两种标量 */
export type RadioValueKind = 'string' | 'number'

/**
 * 单个选项：k/v 对应。
 * - label：卡片上展示的单选文案
 * - value：选中后按节点输出类型强转、再提交给下游的原始文本
 */
export interface RadioOption {
  /** 选项唯一 id（持久化；边/选中态靠它匹配） */
  readonly id: string
  /** 展示名（k） */
  label: string
  /** 原始值（v），提交前按输出类型强转 */
  value: string
}

/** OutputPort 构造所需的 Value 子类形状（与 OutputPort.ts 内的 ValueClass 同构但未导出，这里内联） */
type ValueClass = { readonly VALUE_NAME: ValueKind; prototype: Value; new (...args: any[]): Value }

/** 输出类型 → Value 子类注册表（重建端口 + 强转共用这一处真相） */
const KIND_CLASSES: Record<RadioValueKind, ValueClass> = {
  string: StringValue,
  number: NumberValue
}

/** 所有合法输出类型，readState 反序列化校验用 */
const ALL_KINDS: readonly RadioValueKind[] = ['string', 'number']

/** 节点固定宽度 */
const NODE_WIDTH = 220
/** header 高度 */
const HEADER_HEIGHT = 26
/** 每个选项行高度 */
const ROW_HEIGHT = 26
/** 上下 padding */
const PADDING = 16

/** 内容区高度：随选项数量增长，至少容下一行 */
function computeBoxHeight(optionCount: number): number {
  return Math.max(84, HEADER_HEIGHT + Math.max(1, optionCount) * ROW_HEIGHT + PADDING)
}

/**
 * 单选枚举节点：源头节点，把一组 <b>k/v</b> 选项以竖向单选列表呈现，
 * 点中哪一项就把该项的 v 按节点选定的输出类型强转后提交给下游。
 *
 * - 没有输入端口，只有一个输出端口；输出类型由齿轮设置面板切换（string / number）。
 * - 「同一组 v 只能用同一个输出类型」：整份选项列表共用**一个**输出端口类型。
 * - 输出端口的 valueClass 是 readonly 的，切换类型时按 CodeNode/SwitchNode 的同构做法
 *   拆旧端口、建新端口（旧端口连的下游边随之断开），并立即把当前选中值按新类型重发。
 */
export class RadioNode extends Node {
  static readonly TYPE = 'radio'
  readonly type = RadioNode.TYPE

  /** 输出端口：类型随 kind 动态重建 */
  private output: OutputPort

  /** 选项列表（持久化） */
  private options: RadioOption[]

  /** 输出端口数据类型（持久化） */
  private kind: RadioValueKind = 'string'

  /** 当前选中的选项 id（持久化）；undefined = 未选 */
  private selectedId: string | undefined

  constructor(id: string) {
    super(id)
    this.options = RadioNode.defaultOptions()
    this.output = this.buildOutput()
    super.addOutput(this.output)
    this.setBox(NODE_WIDTH, computeBoxHeight(this.options.length))
  }

  /** 默认给三组示例选项，方便直接开用 */
  private static defaultOptions(): RadioOption[] {
    return [
      { id: RadioNode.newId(), label: 'Option A', value: 'a' },
      { id: RadioNode.newId(), label: 'Option B', value: 'b' },
      { id: RadioNode.newId(), label: 'Option C', value: 'c' }
    ]
  }

  /** 生成一个选项 id */
  private static newId(): string {
    return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  /** 按当前 kind 构造输出端口 */
  private buildOutput(): OutputPort {
    return new OutputPort('value', KIND_CLASSES[this.kind], {
      zh: '值',
      en: 'Value',
      ja: '値',
      ko: '값',
      es: 'Valor',
      ar: 'القيمة',
      fr: 'Valeur',
      pt: 'Valor',
      ru: 'Значение',
      hi: 'मान',
      id: 'Nilai',
      de: 'Wert',
      vi: 'Giá trị',
      tr: 'Değer',
      it: 'Valore'
    })
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  // —— 渲染层读的状态 ——

  /** 当前选项列表 */
  get displayOptions(): readonly RadioOption[] {
    return this.options
  }

  /** 当前输出类型 */
  get displayKind(): RadioValueKind {
    return this.kind
  }

  /** 当前选中的选项 id */
  get displaySelectedId(): string | undefined {
    return this.selectedId
  }

  // —— 用户操作 ——

  /** 选中某个选项 → 立即按其 v 强转提交（转不动则清空输出） */
  select(id: string): void {
    const opt = this.options.find(o => o.id === id)
    if (!opt) return
    this.selectedId = id
    this.commitOption(opt)
    this.notifyChanged()
  }

  /**
   * 切换输出端口数据类型。
   * valueClass 变了旧端口不再合法 → 拆旧建新（旧端口下游边随 removeOutput 自动断开，
   * 与 CodeNode 切返回类型同构）。
   * 切到 number 时先把各选项的字符串值规整为数字：能转的写成规范数字文本，
   * 不能转的清空为空串；随后按新类型重发当前选中值。
   */
  setKind(kind: RadioValueKind): void {
    if (this.kind === kind) return
    this.kind = kind
    if (kind === 'number') this.normalizeValuesToNumber()
    super.removeOutput(this.output)
    this.output = this.buildOutput()
    super.addOutput(this.output)
    this.commitOption(this.options.find(o => o.id === this.selectedId))
    this.notifyChanged()
  }

  /** 追加一个选项，命名接在末尾之后 */
  addOption(): void {
    const seq = this.options.length + 1
    this.options.push({ id: RadioNode.newId(), label: `Option ${seq}`, value: `value${seq}` })
    this.setBox(NODE_WIDTH, computeBoxHeight(this.options.length))
    this.notifyChanged()
  }

  /** 移除某个选项；至少保留一个。若移除的是当前选中项，则清空输出 */
  removeOption(id: string): void {
    if (this.options.length <= 1) return
    const idx = this.options.findIndex(o => o.id === id)
    if (idx === -1) return
    this.options.splice(idx, 1)
    if (this.selectedId === id) {
      this.selectedId = undefined
      this.output.clear()
    }
    this.setBox(NODE_WIDTH, computeBoxHeight(this.options.length))
    this.notifyChanged()
  }

  /** 修改某个选项的展示名（k） */
  setOptionLabel(id: string, label: string): void {
    const opt = this.options.find(o => o.id === id)
    if (!opt || opt.label === label) return
    opt.label = label
    this.notifyChanged()
  }

  /** 修改某个选项的原始值（v）；若它正是当前选中项，则按新值重发（转不动则清空输出） */
  setOptionValue(id: string, value: string): void {
    const opt = this.options.find(o => o.id === id)
    if (!opt || opt.value === value) return
    opt.value = value
    if (this.selectedId === id) {
      this.commitOption(opt)
    }
    this.notifyChanged()
  }

  /**
   * 按当前输出类型把选项原始文本强转为 Value。
   * number：空串或解析不出有限数字 → 返回 undefined（不可转换，调用方据此清空输出）。
   * string：原样送出。
   */
  private coerce(raw: string): Value | undefined {
    if (this.kind === 'number') {
      const trimmed = raw.trim()
      if (trimmed === '') return undefined
      const n = Number(trimmed)
      return Number.isFinite(n) ? new NumberValue(n) : undefined
    }
    return new StringValue(raw)
  }

  /** 提交某个选项：能强转就 commit，转不动（undefined）或选项不存在则清空输出 */
  private commitOption(opt: RadioOption | undefined): void {
    const value = opt ? this.coerce(opt.value) : undefined
    if (value) this.output.commit(value)
    else this.output.clear()
  }

  /**
   * 切到 number 前规整各选项的原始值：能转成有限数字的写成规范数字文本（如 "1.5"），
   * 否则清空为空串——数字输入框里不会残留非法内容。
   */
  private normalizeValuesToNumber(): void {
    for (const opt of this.options) {
      const trimmed = opt.value.trim()
      const n = trimmed === '' ? Number.NaN : Number(trimmed)
      opt.value = Number.isFinite(n) ? String(n) : ''
    }
  }

  /** 没有输入端口，永远收不到通知 */
  inputPortReceiveValue(_ports: InputPort[]): void {}

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      kind: this.kind,
      options: this.options.map(o => ({ id: o.id, label: o.label, value: o.value })),
      selectedId: this.selectedId ?? null
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.kind === 'string' && ALL_KINDS.includes(state.kind as RadioValueKind)) {
      this.kind = state.kind as RadioValueKind
    }

    // 输出端口按恢复后的 kind 重建（构造时已按默认 kind 建过一个，先拆）
    super.removeOutput(this.output)
    this.output = this.buildOutput()
    super.addOutput(this.output)

    const savedOptions = state.options
    if (Array.isArray(savedOptions) && savedOptions.length > 0) {
      const list: RadioOption[] = []
      for (const entry of savedOptions) {
        const obj = entry as Record<string, unknown>
        if (typeof obj.id === 'string' && typeof obj.label === 'string' && typeof obj.value === 'string') {
          list.push({ id: obj.id, label: obj.label, value: obj.value })
        }
      }
      if (list.length > 0) this.options = list
    }

    this.selectedId = typeof state.selectedId === 'string' ? state.selectedId : undefined

    // 端口建好后立刻把选中值提交一次，下游才能收到（哪怕与默认值相同）
    this.commitOption(this.options.find(o => o.id === this.selectedId))

    this.setBox(NODE_WIDTH, computeBoxHeight(this.options.length))
    this.notifyChanged()
  }
}