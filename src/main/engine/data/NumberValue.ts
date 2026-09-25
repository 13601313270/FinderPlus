import { Value } from './Value'

/** 数字传输子 */
export class NumberValue extends Value {
  readonly kind = 'number' as const

  readonly fingerprint: string

  constructor(readonly value: number) {
    super()
    this.fingerprint = `number:${value}`
  }

  toJSON(): { kind: 'number'; value: number } {
    return { kind: 'number', value: this.value }
  }
}
