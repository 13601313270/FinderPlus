import type { LocalizedText } from '../../../shared/language'
import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { BoolValue } from '../../engine/data/BoolValue'
import { FileValue } from '../../engine/data/FileValue'
import { HtmlFileValue } from '../../engine/data/HtmlFileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { JsonFileValue } from '../../engine/data/JsonFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { PdfFileValue } from '../../engine/data/PdfFileValue'
import { StringValue } from '../../engine/data/StringValue'
import { TxtFileValue } from '../../engine/data/TxtFileValue'
import { VideoFileValue } from '../../engine/data/VideoFileValue'
import { Value, type ValueKind } from '../../engine/data/Value'
import { InputPortChangeSource, Node } from '../../engine/node/Node'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'

/** OutputPort 构造函数需要的 Value 子类形状 */
type ValueClass = { readonly VALUE_NAME: ValueKind; prototype: Value; new(...args: any[]): Value }

/** 按钮输出类型（开放枚举，与 BUILTIN_VALUE_KINDS 对齐） */
export type ButtonValueType =
  | 'bool'
  | 'number'
  | 'string'
  | 'json'
  | 'file'
  | 'txt-file'
  | 'html-file'
  | 'json-file'
  | 'img-file'
  | 'pdf-file'
  | 'audio-file'
  | 'video-file'

/** ValueKind → Value 子类映射表 */
const VALUE_TYPE_TO_CLASS: Record<ButtonValueType, ValueClass> = {
  bool: BoolValue,
  number: NumberValue,
  string: StringValue,
  json: JsonValue,
  file: FileValue,
  'txt-file': TxtFileValue,
  'html-file': HtmlFileValue,
  'json-file': JsonFileValue,
  'img-file': ImgFileValue,
  'pdf-file': PdfFileValue,
  'audio-file': AudioFileValue,
  'video-file': VideoFileValue
}

/** 按钮配置项 */
export interface ButtonConfig {
  /** 按钮唯一标识，同时作为 OutputPort 的 id */
  id: string
  /** 按钮显示文本 */
  label: string
  /** 输出端口类型 */
  valueType: ButtonValueType
}

/** 所有合法 ButtonValueType 数组（共享给类型守卫和 UI 下拉） */
export const ALL_BUTTON_VALUE_TYPES: readonly ButtonValueType[] = [
  'bool', 'number', 'string', 'json', 'file',
  'txt-file', 'html-file', 'json-file', 'img-file',
  'pdf-file', 'audio-file', 'video-file'
]

/** 节点宽度（固定） */
const NODE_WIDTH = 180
/** 按钮行高 */
const ROW_HEIGHT = 40
/** header + padding 固定开销 */
const BASE_HEIGHT = 48
/** 节点最小高度 */
const MIN_HEIGHT = 150

/** 内容区高度：随按钮数量增长 */
function computeBoxHeight(btnCount: number): number {
  const btnListHeight = BASE_HEIGHT + btnCount * ROW_HEIGHT + (btnCount - 1) * 6;
  return Math.max(MIN_HEIGHT, btnListHeight);
}

/**
 * 手动触发节点：配置多个按钮，每个按钮对应一个 OutputPort。
 *
 * - 多个输出端口：按按钮配置动态创建，每个端口可以是不同类型
 * - 手动语义：点击按钮 → commit null 值到对应 OutputPort → 推送下游
 */
export class ManualTriggerNode extends Node {
  static readonly TYPE = 'manual-trigger'
  readonly type = ManualTriggerNode.TYPE

  /** 生成一个按钮 id */
  static newButtonId(): string {
    return `btn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  /** 按钮配置数组 */
  private buttons: ButtonConfig[] = []

  /** 按钮 id → OutputPort 映射 */
  private readonly portMap = new Map<string, OutputPort>()

  constructor(id: string) {
    super(id)
    // 默认添加一个按钮作为初始配置
    this.buttons.push({
      id: ManualTriggerNode.newButtonId(),
      label: '按钮 1',
      valueType: 'string'
    })
    this.rebuildAllOutputs()
    this.setBox(NODE_WIDTH, computeBoxHeight(this.buttons.length))
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  // —— 渲染层读的状态 ——

  /** 当前按钮配置列表（只读副本） */
  get buttonConfigs(): ReadonlyArray<ButtonConfig> {
    return [...this.buttons]
  }

  /** 按钮数量 */
  get buttonCount(): number {
    return this.buttons.length
  }

  /**
   * 取指定按钮对应的 OutputPort（渲染层可能需要读端口当前值等）。
   */
  getPortForButton(buttonId: string): OutputPort | undefined {
    return this.portMap.get(buttonId)
  }

  // —— 输入通知 ——

  /**
   * 输入端口变化时**不自动触发**——这是手动触发节点的核心语义。
   * 只做观察者通知刷新 UI，不 commit 任何输出。
   */
  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    this.notifyChanged()
  }

  // —— 按钮配置管理 ——

  /**
   * 设置完整按钮配置列表。会对比差异：
   * - 新增按钮 → 创建新 OutputPort
   * - 删除按钮 → 移除对应 OutputPort（自动断下游边）
   * - 变更按钮类型 → 重建 OutputPort
   * - 变更按钮 label → 只更新端口 label
   */
  setButtons(newButtons: ButtonConfig[]): void {
    // 深拷贝防外部修改
    const normalized = newButtons.map(b => ({ ...b }))

    // 先找出需要删除的端口
    const keepIds = new Set(normalized.map(b => b.id))
    const toRemove: string[] = []
    for (const existingId of this.portMap.keys()) {
      if (!keepIds.has(existingId)) {
        toRemove.push(existingId)
      }
    }

    // 删除不再需要的端口
    for (const removeId of toRemove) {
      const port = this.portMap.get(removeId)
      if (port) {
        this.removeOutput(port)
        this.portMap.delete(removeId)
      }
    }

    // 遍历新配置，对齐每个按钮的端口
    for (const btn of normalized) {
      this.ensurePortForButton(btn)
    }

    // 替换配置
    this.buttons = normalized
    this.setBox(NODE_WIDTH, computeBoxHeight(this.buttons.length))
    this.notifyChanged()
  }

  /** 追加一个默认按钮（类型 string） */
  addButton(): void {
    const newBtn: ButtonConfig = {
      id: ManualTriggerNode.newButtonId(),
      label: `按钮 ${this.buttons.length + 1}`,
      valueType: 'string'
    }
    this.buttons.push(newBtn)
    this.ensurePortForButton(newBtn)
    this.setBox(NODE_WIDTH, computeBoxHeight(this.buttons.length))
    this.notifyChanged()
  }

  /** 删除指定按钮；至少保留一个 */
  removeButton(buttonId: string): void {
    if (this.buttons.length <= 1) return
    const idx = this.buttons.findIndex(b => b.id === buttonId)
    if (idx === -1) return
    this.buttons.splice(idx, 1)
    const port = this.portMap.get(buttonId)
    if (port) {
      this.removeOutput(port)
      this.portMap.delete(buttonId)
    }
    this.setBox(NODE_WIDTH, computeBoxHeight(this.buttons.length))
    this.notifyChanged()
  }

  /** 修改按钮显示文本 */
  setButtonLabel(buttonId: string, label: string): void {
    const btn = this.buttons.find(b => b.id === buttonId)
    if (!btn || btn.label === label) return
    btn.label = label
    const port = this.portMap.get(buttonId)
    if (port) {
      port.setLabel({ zh: label })
    }
    this.notifyChanged()
  }

  /** 修改按钮输出类型；类型变了 → 重建 OutputPort（下游边自动断） */
  setButtonType(buttonId: string, valueType: ButtonValueType): void {
    const btn = this.buttons.find(b => b.id === buttonId)
    if (!btn || btn.valueType === valueType) return
    btn.valueType = valueType

    // 重建端口
    const port = this.portMap.get(buttonId)
    if (port) {
      this.removeOutput(port)
      this.portMap.delete(buttonId)
    }
    const newPort = this.createOutputPort(btn)
    this.portMap.set(buttonId, newPort)
    this.addOutput(newPort)

    this.notifyChanged()
  }

  /**
   * 确保指定按钮有一个类型匹配、存在于 outputs 数组中的端口。
   * - 端口不存在 → 创建新的
   * - 端口存在但类型不对 → 删掉重建
   * - 端口存在类型对 → 仅更新 label
   */
  private ensurePortForButton(btn: ButtonConfig): void {
    const expectedClass = VALUE_TYPE_TO_CLASS[btn.valueType]
    const existing = this.portMap.get(btn.id)

    if (existing === undefined) {
      // 新建
      const port = this.createOutputPort(btn)
      this.portMap.set(btn.id, port)
      this.addOutput(port)
      return
    }

    if (existing.valueClass !== expectedClass) {
      // 类型变了 → 删掉重建
      this.removeOutput(existing)
      this.portMap.delete(btn.id)
      const port = this.createOutputPort(btn)
      this.portMap.set(btn.id, port)
      this.addOutput(port)
      return
    }

    // 类型没变 → 检查 label 是否需要更新
    const newLabel: LocalizedText = { zh: btn.label }
    const currentLabel = existing.label as Record<string, string>
    if (currentLabel.zh !== btn.label) {
      existing.setLabel(newLabel)
    }
  }

  /** 按按钮配置创建一个新的 OutputPort */
  private createOutputPort(btn: ButtonConfig): OutputPort {
    const valueClass = VALUE_TYPE_TO_CLASS[btn.valueType]
    return new OutputPort(btn.id, valueClass, { zh: btn.label })
  }

  /** 全量重建所有输出端口（构造 / readState 恢复时用） */
  private rebuildAllOutputs(): void {
    // 先清空现有端口
    for (const port of this.portMap.values()) {
      this.removeOutput(port)
    }
    this.portMap.clear()

    // 按配置重建
    for (const btn of this.buttons) {
      const port = this.createOutputPort(btn)
      this.portMap.set(btn.id, port)
      this.addOutput(port)
    }
  }

  // —— 手动触发 ——

  /**
   * 点击按钮触发：commit null 值到对应 OutputPort，force=true 推送下游。
   * 没有输入端口，按钮就是纯信号——每次点击发一次触发。
   */
  trigger(buttonId: string): void {
    const btn = this.buttons.find(b => b.id === buttonId)
    if (!btn) return

    const port = this.portMap.get(buttonId)
    if (!port) return

    port.commit(this.makeNullValue(btn.valueType), { force: true })
    this.notifyChanged()
  }

  /** 按 valueType 构造一个 null 值 */
  private makeNullValue(valueType: ButtonValueType): Value {
    const Cls = VALUE_TYPE_TO_CLASS[valueType]
    // FileValue 子类和其他子类一样，无参构造即为 null
    return new Cls()
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      ...super.saveState(),
      buttons: this.buttons.map(b => ({ ...b }))
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    const savedButtons = state.buttons
    if (Array.isArray(savedButtons) && savedButtons.length > 0) {
      // 校验并恢复按钮配置
      const valid: ButtonConfig[] = []
      for (const raw of savedButtons) {
        if (this.isValidButtonConfig(raw)) {
          valid.push(raw)
        }
      }
      if (valid.length > 0) {
        this.buttons = valid
      }
    }
    // 根据配置重建输出端口
    this.rebuildAllOutputs()
    this.setBox(NODE_WIDTH, computeBoxHeight(this.buttons.length))
    this.notifyChanged()
  }

  /** 运行时类型守卫：确保反序列化的数据形状正确 */
  private isValidButtonConfig(raw: unknown): raw is ButtonConfig {
    if (typeof raw !== 'object' || raw === null) return false
    const obj = raw as Record<string, unknown>
    if (typeof obj.id !== 'string' || !obj.id) return false
    if (typeof obj.label !== 'string') return false
    if (!this.isValidButtonValueType(obj.valueType)) return false
    return true
  }

  /** 运行时类型守卫：确保 valueType 是合法的 ButtonValueType */
  private isValidButtonValueType(v: unknown): v is ButtonValueType {
    return typeof v === 'string' && ALL_BUTTON_VALUE_TYPES.includes(v as ButtonValueType)
  }
}
