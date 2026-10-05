import { Value, type ValueKind } from './Value'

/** 数字传输子 */
export class NumberValue extends Value {
  static override readonly VALUE_NAME: ValueKind = 'number'

  readonly fingerprint: string

  /** @param value 不传即为 null 值（isNull=true） */
  constructor(readonly value?: number) {
    super(value === undefined)
    this.fingerprint = value === undefined ? 'number:null' : `number:${value}`
  }

  override get displayLabel(): string {
    return this.isNull ? '(null)' : String(this.value)
  }
}
