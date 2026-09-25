import { Value } from './Value'

/** 字符串传输子 */
export class StringValue extends Value {
  readonly kind = 'string' as const

  readonly fingerprint: string

  constructor(readonly value: string) {
    super()
    this.fingerprint = `string:${value}`
  }

}
