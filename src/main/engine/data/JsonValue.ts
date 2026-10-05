import { djb2 } from './hash'
import { Value, type ValueKind } from './Value'

/**
 * JSON/结构化传输子：承载任意可 JSON 序列化的 JS 值。
 *
 * 特别注意两种"空"的区分：
 * - new JsonValue()          → isNull=true （主动 null，上游没值）
 * - new JsonValue(null)      → isNull=false, value=null（合法 JSON null 值）
 * - new JsonValue(undefined) → isNull=true, value=undefined（undefined 不合法，自动归 null）
 */
export class JsonValue extends Value {
  static override readonly VALUE_NAME: ValueKind = 'json'

  readonly fingerprint: string

  /** @param value 不传即为 isNull=true；显式传 null / 空对象等则 isNull=false */
  constructor(readonly value?: unknown) {
    super(value === undefined)
    this.fingerprint = value === undefined ? 'json:null' : `json:${djb2(this.canonicalStringify(value))}`
  }

  /**
   * 规范化 JSON 序列化：对象键按字母序排列、无多余空格，
   * 保证 `{a:1, b:2}` 和 `{b:2, a:1}` 得到相同字符串 → 相同哈希。
   */
  private canonicalStringify(v: unknown): string {
    return JSON.stringify(v, (_k, val) => {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const sorted = Object.keys(val).sort()
        const ordered: Record<string, unknown> = {}
        for (const key of sorted) {
          ordered[key] = (val as Record<string, unknown>)[key]
        }
        return ordered
      }
      return val
    })
  }

  override get displayLabel(): string {
    if (this.isNull) return '(null)'
    // 简短摘要：对象/数组显示类型+长度，原始值直接 stringify
    if (this.value === null) return 'null'
    if (Array.isArray(this.value)) return `array(${this.value.length})`
    if (typeof this.value === 'object') {
      const keys = Object.keys(this.value as Record<string, unknown>)
      return `object(${keys.length} keys)`
    }
    return JSON.stringify(this.value)
  }
}
