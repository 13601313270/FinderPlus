import { djb2 } from '../../engine/data/hash'
import { HtmlFileValue } from '../../engine/data/HtmlFileValue'
import { TxtFileValue } from '../../engine/data/TxtFileValue'
import { FileValue } from '../../engine/data/FileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { BoolValue } from '../../engine/data/BoolValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import type { Value } from '../../engine/data/Value'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { inLabel, outLabel } from './i18n'

/** 支持的转换目标类型 */
export type ConvertTarget = 'string' | 'number' | 'bool' | 'json' | 'html-file' | 'txt-file'

/** 目标类型 → Value 子类映射 */
const TARGET_TO_CLASS: Record<ConvertTarget, ValueClass> = {
  string: StringValue,
  number: NumberValue,
  bool: BoolValue,
  json: JsonValue,
  'html-file': HtmlFileValue,
  'txt-file': TxtFileValue,
}

/** 通用 Value 子类类型（带静态 VALUE_NAME） */
type ValueClass = { readonly VALUE_NAME: string; prototype: Value; new (...args: any[]): Value }

/** 所有接受的输入 Value 子类（FileValue 作为基类覆盖所有文件子类） */
const ACCEPTS: ValueClass[] = [
  StringValue, NumberValue, BoolValue, JsonValue, FileValue
]

/**
 * 类型转换节点：把上游任意 Value 子类转换成用户指定的目标类型。
 *
 * - 输入端口：accepts StringValue / NumberValue / BoolValue / JsonValue / FileValue（含所有文件子类）
 * - 输出端口：类型由 targetType 配置决定，改了就动态重建
 * - 标量互转 & 标量 → 文件：同步转换
 * - 文件 → 标量：异步（await file.text() 读取内容）
 */
export class ConvertNode extends Node {
  static readonly TYPE = 'convert'
  readonly type = ConvertNode.TYPE

  /** 目标类型，默认 string */
  private targetType: ConvertTarget = 'string'

  /** 输入端口 */
  private readonly inputPort: InputPort

  /** 输出端口（根据 targetType 动态重建） */
  private outputPort: OutputPort | undefined

  constructor(id: string) {
    super(id)
    this.inputPort = new InputPort('in', {
      accepts: ACCEPTS,
      label: inLabel,
      isHiddenLabel: true
    })
    this.addInput(this.inputPort)
    // 构造时先按默认类型建输出端口
    this.rebuildOutputPort(this.targetType)
    this.setBox(140, 60)
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  // —— 渲染层读的状态 ——

  /** 当前输出端口的类型标签（UI 显示） */
  get displayTargetType(): string {
    return this.targetType
  }

  /** 当前 targetType（供 UI 下拉回显） */
  get currentTargetType(): ConvertTarget {
    return this.targetType
  }

  // —— 配置修改 ——

  /** 设置目标类型；类型变了 → 重建输出端口（下游连线会随 removeOutput 自动断开） */
  setTargetType(target: ConvertTarget): void {
    if (target === this.targetType) return
    this.targetType = target
    this.rebuildOutputPort(target)
    this.notifyChanged()
    // 输出端口换了类型 → 重新触发转换
    this.triggerConvert()
  }

  // —— 输入：对齐 + 转换 ——

  inputPortReceiveValue(): void {
    const hasEdges = this.inputPort.incomingEdgeCount > 0
    if (!hasEdges) {
      // 上游完全断开
      if (this.outputPort) {
        this.outputPort.commit(this.makeNullValue(this.targetType))
      }
      this.notifyChanged()
      this.completeRun()
      return
    }
    this.triggerConvert()
  }

  /** 执行转换；内部区分同步/异步路径 */
  private triggerConvert(): void {
    if (!this.outputPort) return

    const [value] = this.inputPort.value
    if (value === undefined || value.isNull) {
      // 上游还没值 或 主动 null → 推送 null 目标值
      this.outputPort.commit(this.makeNullValue(this.targetType))
      this.notifyChanged()
      this.completeRun()
      return
    }

    // 文件类源 → 走异步分支（需要读 File.text()）
    if (value instanceof FileValue) {
      void this.convertAsync(value)
      return
    }

    // 标量源 → 同步转换
    try {
      const result = this.convertSync(value, this.targetType)
      if (result !== undefined) {
        this.outputPort.commit(result, { force: true })
      } else {
        // 不支持的转换方向 → 推送 null
        this.outputPort.commit(this.makeNullValue(this.targetType))
      }
      this.notifyChanged()
      this.completeRun()
    } catch (err) {
      console.warn('[ConvertNode] 同步转换失败：', err)
      this.notifyChanged()
      this.failRun()
    }
  }

  /** 异步转换：文件类 → 目标类型 */
  private async convertAsync(value: FileValue): Promise<void> {
    this.beginRun()
    try {
      const text = await value.file!.text()
      let result: Value | undefined

      if (this.targetType === 'string') {
        result = new StringValue(text)
      } else if (this.targetType === 'number') {
        const num = parseFloat(text)
        result = Number.isFinite(num) ? new NumberValue(num) : undefined
      } else if (this.targetType === 'bool') {
        result = new BoolValue(parseBoolString(text))
      } else if (this.targetType === 'json') {
        result = new JsonValue(JSON.parse(text))
      } else if (this.targetType === 'html-file' || this.targetType === 'txt-file') {
        const ext = this.targetType === 'html-file' ? 'html' : 'txt'
        const mime = this.targetType === 'html-file' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8'
        const fileName = value.file?.name ?? `${this.id}.${ext}`
        // 换掉文件的扩展名
        const newName = fileName.replace(/\.[^.]+$/, `.${ext}`)
        const file = new File([text], newName, { type: mime })
        const hash = djb2(text)
        const Cls = TARGET_TO_CLASS[this.targetType]
        result = new Cls(file, hash) as Value
      }

      if (result !== undefined && this.outputPort) {
        this.outputPort.commit(result, { force: true })
      }
      this.notifyChanged()
      this.completeRun()
    } catch (err) {
      console.warn('[ConvertNode] 异步转换失败：', err)
      this.notifyChanged()
      this.failRun()
    }
  }

  /**
   * 同步转换：标量源 → 任意目标。
   * 不支持的组合返回 undefined（比如 JsonValue → NumberValue 除非 JSON.parse 出来就是数字）。
   */
  private convertSync(value: Value, target: ConvertTarget): Value | undefined {
    // 先统一抽出源字符串表示（便于构造文件类目标）
    // 同时也给 number/bool 解析兜底

    if (target === 'string') {
      return new StringValue(scalarToString(value))
    }

    if (target === 'number') {
      return new NumberValue(scalarToNumber(value))
    }

    if (target === 'bool') {
      return new BoolValue(scalarToBool(value))
    }

    if (target === 'json') {
      return new JsonValue(scalarToJson(value))
    }

    // 标量 → 文件类：先转成 string，再 new File
    if (target === 'html-file' || target === 'txt-file') {
      const text = scalarToString(value)
      const ext = target === 'html-file' ? 'html' : 'txt'
      const mime = target === 'html-file' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8'
      const file = new File([text], `${this.id}.${ext}`, { type: mime })
      const hash = djb2(text)
      const Cls = TARGET_TO_CLASS[target]
      return new Cls(file, hash) as Value
    }

    return undefined
  }

  /** 按目标类型构造一个 null 值（用于上游断连时推送） */
  private makeNullValue(target: ConvertTarget): Value {
    const Cls = TARGET_TO_CLASS[target]
    if (target === 'html-file' || target === 'txt-file') {
      return new Cls() as Value
    }
    // NumberValue / BoolValue / JsonValue / StringValue 的无参构造都是 null 值
    return new Cls() as Value
  }

  // —— 输出端口管理 ——

  private rebuildOutputPort(target: ConvertTarget): void {
    if (this.outputPort) {
      this.removeOutput(this.outputPort)
      this.outputPort = undefined
    }
    const Cls = TARGET_TO_CLASS[target]
    this.outputPort = new OutputPort('out', Cls, outLabel)
    this.addOutput(this.outputPort)
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return { ...super.saveState(), targetType: this.targetType }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)
    if (isConvertTarget(state.targetType)) {
      this.targetType = state.targetType
      this.rebuildOutputPort(this.targetType)
    }
  }
}

// ====== 转换辅助函数 ======

function parseBoolString(s: string): boolean {
  const trimmed = s.trim().toLowerCase()
  if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes') return true
  return false
}

function scalarToString(value: Value): string {
  if (value instanceof StringValue) return value.value ?? ''
  if (value instanceof NumberValue) return String(value.value ?? 0)
  if (value instanceof BoolValue) return value.value ? 'true' : 'false'
  if (value instanceof JsonValue) return JSON.stringify(value.value)
  return ''
}

function scalarToNumber(value: Value): number {
  if (value instanceof StringValue) return parseFloat(value.value ?? '0')
  if (value instanceof NumberValue) return value.value ?? 0
  if (value instanceof BoolValue) return value.value ? 1 : 0
  if (value instanceof JsonValue) {
    const v = value.value
    if (typeof v === 'number') return v
    if (typeof v === 'string') return parseFloat(v) || 0
    return 0
  }
  return 0
}

function scalarToBool(value: Value): boolean {
  if (value instanceof StringValue) return parseBoolString(value.value ?? '')
  if (value instanceof NumberValue) return (value.value ?? 0) !== 0
  if (value instanceof BoolValue) return value.value ?? false
  if (value instanceof JsonValue) return !!value.value
  return false
}

function scalarToJson(value: Value): unknown {
  if (value instanceof StringValue) {
    // 字符串 → 尝试 JSON.parse，失败则当普通字符串塞进 JsonValue
    try {
      return JSON.parse(value.value ?? 'null')
    } catch {
      return value.value
    }
  }
  if (value instanceof NumberValue) return value.value
  if (value instanceof BoolValue) return value.value
  if (value instanceof JsonValue) return value.value
  return null
}

function isConvertTarget(v: unknown): v is ConvertTarget {
  return v === 'string' || v === 'number' || v === 'bool' || v === 'json' || v === 'html-file' || v === 'txt-file'
}
