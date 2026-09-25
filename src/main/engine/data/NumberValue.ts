import { Value, type ValueKind } from './Value'

/** 数字传输子 */
export class NumberValue extends Value {
  static override readonly KIND: ValueKind = 'number'

  readonly fingerprint: string

  constructor(readonly value: number) {
    super()
    this.fingerprint = `number:${value}`
  }
}
