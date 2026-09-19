import { Value } from './Value'

/** 字符串传输子 */
export class StringValue extends Value {
  readonly kind = 'string' as const

  constructor(readonly value: string) {
    super()
  }

  get fingerprint(): string {
    return `string:${this.value}`
  }

  toJSON(): { kind: 'string'; value: string } {
    return { kind: 'string', value: this.value }
  }
}