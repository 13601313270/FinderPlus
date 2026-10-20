import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { Value, type ValueKind } from '../../engine/data/Value'
import { JsonValue } from '../../engine/data/JsonValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { InputPort } from '../../engine/port/InputPort'
import { Node } from '../../engine/node/Node'

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

/** 选项来源：manual = 齿轮面板手动配置，input = 输入端口 JSON 注入 */
export type RadioOptionsSource = 'manual' | 'input'

/**
 * 把上游传来的 JSON 值解析成 RadioOption[]。
 * 支持多种灵活格式：
 *   1) ["a", "b", "c"]                          → label = value = 元素字符串
 *   2) [{ label: "A", value: "a" }, ...]        → 完整对象数组
 *   3) [{ name: "A", val: "a" }, ...]           → 简写对象数组
 *   4) { "a": "A", "b": "B" }                   → 对象，key=value, val=label
 *   5) { options: [...] }                        → 带 options 包一层的对象
 *
 * 解析失败或值不是数组/对象时返回 null（调用方据此走回退逻辑）。
 */
function parseOptionsFromJson(raw: unknown): RadioOption[] | null {
  if (raw === null || raw === undefined) return null

  let payload: unknown = raw

  // 如果是 { options: [...] } 形式，剥开一层
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.options)) {
      payload = obj.options
    } else if (Array.isArray(obj.items)) {
      payload = obj.items
    }
  }

  // 纯字符串数组 → label = value
  if (Array.isArray(payload) && payload.length > 0 && typeof payload[0] === 'string') {
    return (payload as string[]).map(s => ({
      id: RadioNode.newId(),
      label: s,
      value: s
    }))
  }

  // 对象数组 → 逐行提取 label/value
  if (Array.isArray(payload)) {
    const list: RadioOption[] = []
    for (const item of payload) {
      if (typeof item !== 'object' || item === null) continue
      const obj = item as Record<string, unknown>
      const label = (
        typeof obj.label === 'string' ? obj.label :
        typeof obj.name === 'string' ? obj.name :
        typeof obj.key === 'string' ? obj.key :
        typeof obj.title === 'string' ? obj.title :
        null
      )
      const value = (
        typeof obj.value === 'string' ? obj.value :
        typeof obj.val === 'string' ? obj.val :
        typeof obj.v === 'string' ? obj.v :
        typeof obj.id === 'string' ? obj.id :
        null
      )
      // value 可以是 number / boolean，转成字符串
      const valueStr = value !== null
        ? String(value)
        : (typeof obj.value === 'number' || typeof obj.value === 'boolean'
            ? String(obj.value)
            : null)
      const labelStr = label !== null ? label : valueStr
      if (labelStr && valueStr) {
        list.push({ id: RadioNode.newId(), label: labelStr, value: valueStr })
      }
    }
    return list.length > 0 ? list : null
  }

  // 对象形式 { value: label, ... }
  if (typeof payload === 'object' && payload !== null) {
    const entries = Object.entries(payload as Record<string, unknown>)
    if (entries.length === 0) return null
    const list: RadioOption[] = []
    for (const [key, val] of entries) {
      if (typeof val === 'string' || typeof val === 'number') {
        list.push({ id: RadioNode.newId(), label: String(val), value: key })
      }
    }
    return list.length > 0 ? list : null
  }

  return null
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
 * 单选枚举节点：把一组 <b>k/v</b> 选项以竖向单选列表呈现，
 * 点中哪一项就把该项的 v 按节点选定的输出类型强转后提交给下游。
 *
 * - 支持一个输入端口（接受 JsonValue），传入 JSON 数组/对象可以**覆盖**齿轮面板手动配置的选项列表。
 * - 输入端口断开或清空后，自动回退到上一次手动配置的选项（或默认选项）。
 * - 输出类型由齿轮设置面板切换（string / number），不随 JSON 输入自动推断。
 * - 「同一组 v 只能用同一个输出类型」：整份选项列表共用**一个**输出端口类型。
 * - 输出端口的 valueClass 是 readonly 的，切换类型时按 CodeNode/SwitchNode 的同构做法
 *   拆旧端口、建新端口（旧端口连的下游边随之断开），并立即把当前选中值按新类型重发。
 */
export class RadioNode extends Node {
  static readonly TYPE = 'radio'
  readonly type = RadioNode.TYPE

  /** 选项来源：manual = 齿轮面板手动配置，input = 输入端口 JSON 注入 */
  private source: RadioOptionsSource = 'manual'

  /** 手动配置的选项备份（输入端口覆盖后仍保留，断开时回退用） */
  private manualOptions: RadioOption[]

  /** 当前生效的选项列表（source=input 时来自 JSON 解析，否则等于 manualOptions） */
  private options: RadioOption[]

  /** 输出端口：类型随 kind 动态重建 */
  private output: OutputPort

  /** 输入端口：接受 JsonValue，传入枚举选项 JSON */
  private readonly inputPort: InputPort

  /** 输出端口数据类型（持久化） */
  private kind: RadioValueKind = 'string'

  /** 当前选中的选项 id（持久化）；undefined = 未选 */
  private selectedId: string | undefined

  constructor(id: string) {
    super(id)
    this.manualOptions = RadioNode.defaultOptions()
    this.options = [...this.manualOptions]
    this.inputPort = new InputPort('options', {
      accepts: [JsonValue],
      required: false,
      label: {
        zh: '选项 JSON',
        en: 'Options JSON',
        ja: 'オプション JSON',
        ko: '옵션 JSON',
        es: 'Opciones JSON',
        ar: 'خيارات JSON',
        fr: 'JSON des options',
        pt: 'JSON das opções',
        ru: 'JSON вариантов',
        hi: 'विकल्प JSON',
        id: 'JSON Opsi',
        de: 'Optionen JSON',
        vi: 'JSON tùy chọn',
        tr: 'Seçenekler JSON',
        it: 'JSON opzioni'
      }
    })
    super.addInput(this.inputPort)
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
  static newId(): string {
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

  /** 当前选项来源：manual = 齿轮面板手动配置，input = 输入端口 JSON 注入 */
  get displaySource(): RadioOptionsSource {
    return this.source
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

  /**
   * 选项输入端口回调：上游 JSON 变化 → 重建选项；断开 → 回退手动配置。
   *
   * 解析成功（receive + 有效 JSON）时：
   *   - source 切到 'input'
   *   - 用解析出的选项替换 this.options
   *   - 尝试按 value 匹配保留 selectedId（输入选项不提供稳定 id，只能靠 value 值匹配）
   *   - 按匹配结果 commit 输出（匹配不到就清空）
   *   - 调整节点高度
   *
   * receiveClear / unbindEdge 时（输入断了）：
   *   - source 切回 'manual'
   *   - 恢复 this.options = manualOptions 的浅拷贝
   *   - 按恢复后的选中态重发输出
   */
  inputPortReceiveValue(
    ports: InputPort[],
    source: 'receive' | 'receiveClear' | 'bindEdge' | 'unbindEdge'
  ): void {
    const port = ports.find(p => p.id === 'options')
    if (!port) return

    if (source === 'receive') {
      const val = port.lastReceiveValue
      if (val instanceof JsonValue && !val.isNull) {
        const parsed = parseOptionsFromJson(val.value)
        if (parsed && parsed.length > 0) {
          this.applyInputOptions(parsed)
          return
        }
        // 解析失败 → 不覆盖现有选项，保持 manual 模式
      }
      // 收到 null / 无效 JSON → 等同清空
      this.restoreManual()
      return
    }

    // receiveClear / unbindEdge → 输入断了，回退手动
    if (source === 'receiveClear' || source === 'unbindEdge') {
      this.restoreManual()
    }
    // bindEdge：新连线但上游还没补送值，等 receive 再说
  }

  /** 输入端口 JSON 解析成功 → 覆盖选项列表 */
  private applyInputOptions(parsed: RadioOption[]): void {
    this.source = 'input'
    this.options = parsed
    // 尝试按 value 匹配保留选中态（JSON 不提供稳定 id，只能靠 value 值匹配）
    const prevValue = this.selectedId
      ? (this.options.find(o => o.id === this.selectedId)
          ? this.options.find(o => o.id === this.selectedId)!.value
          : undefined)
      : undefined
    // 重新匹配：先按 value 精确匹配
    let matched = parsed.find(o => o.value === prevValue)
    if (!matched && this.selectedId) {
      // value 对不上（比如输出类型切换过或值被规范化了），尝试在原始 parsed 里找到 selectedId
      matched = parsed.find(o => o.id === this.selectedId)
    }
    if (matched) {
      this.selectedId = matched.id
      this.commitOption(matched)
    } else {
      // 没匹配到 → 清空选中
      this.selectedId = undefined
      this.output.clear()
    }
    this.setBox(NODE_WIDTH, computeBoxHeight(this.options.length))
    this.notifyChanged()
  }

  /** 输入端口断开 → 回退手动配置 */
  private restoreManual(): void {
    if (this.source === 'manual') return
    this.source = 'manual'
    this.options = [...this.manualOptions]
    // 恢复选中态（manualOptions 里的 id 是原来自己生成的，selectedId 应该能直接匹配）
    this.setBox(NODE_WIDTH, computeBoxHeight(this.options.length))
    this.commitOption(this.options.find(o => o.id === this.selectedId))
    this.notifyChanged()
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      kind: this.kind,
      // 只持久化手动配置的选项，输入驱动的选项由上游在 readState 后重新推送
      options: this.manualOptions.map(o => ({ id: o.id, label: o.label, value: o.value })),
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

    // 恢复手动配置的选项
    const savedOptions = state.options
    if (Array.isArray(savedOptions) && savedOptions.length > 0) {
      const list: RadioOption[] = []
      for (const entry of savedOptions) {
        const obj = entry as Record<string, unknown>
        if (typeof obj.id === 'string' && typeof obj.label === 'string' && typeof obj.value === 'string') {
          list.push({ id: obj.id, label: obj.label, value: obj.value })
        }
      }
      if (list.length > 0) {
        this.manualOptions = list
      }
    }

    // 默认 manual 模式；如果输入端口已有值（从 connect 恢复过来的），等 receive 会自动覆盖
    this.source = 'manual'
    this.options = [...this.manualOptions]

    this.selectedId = typeof state.selectedId === 'string' ? state.selectedId : undefined

    // 端口建好后立刻把选中值提交一次，下游才能收到（哪怕与默认值相同）
    this.commitOption(this.options.find(o => o.id === this.selectedId))

    this.setBox(NODE_WIDTH, computeBoxHeight(this.options.length))
    this.notifyChanged()
  }
}