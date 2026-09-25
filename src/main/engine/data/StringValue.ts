import { Value, type ValueKind } from './Value'

/** 字符串传输子 */
export class StringValue extends Value {
  static override readonly VALUE_NAME: ValueKind = 'string'

  readonly fingerprint: string

  constructor(readonly value: string) {
    super()
    this.fingerprint = `string:${value}`
  }
}
