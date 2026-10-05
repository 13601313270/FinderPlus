import { Value, type ValueKind } from './Value'

/** 字符串传输子 */
export class StringValue extends Value {
  static override readonly VALUE_NAME: ValueKind = 'string'

  readonly fingerprint: string

  /** @param value 不传即为 null 值（isNull=true）；传空串则 isNull=false、value="" */
  constructor(readonly value?: string) {
    super(value === undefined)
    this.fingerprint = value === undefined ? 'string:null' : `string:${value}`
  }

  override get displayLabel(): string {
    return this.isNull ? '(null)' : this.value ?? ''
  }
}
