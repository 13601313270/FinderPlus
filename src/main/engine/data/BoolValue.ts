import { Value, type ValueKind } from './Value'

/** 布尔传输子 */
export class BoolValue extends Value {
  static override readonly VALUE_NAME: ValueKind = 'bool'

  readonly fingerprint: string

  /** @param value 不传即为 null 值（isNull=true）；传 false 则 isNull=false、value=false */
  constructor(readonly value?: boolean) {
    super(value === undefined)
    this.fingerprint = value === undefined ? 'bool:null' : `bool:${value}`
  }

  override get displayLabel(): string {
    return this.isNull ? '(null)' : String(this.value)
  }
}