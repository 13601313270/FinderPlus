import { Value } from './Value'

/** 数字传输子 */
export class NumberValue extends Value {
  readonly kind = 'number' as const

  constructor(readonly value: number) {
    super()
  }

  get fingerprint(): string {
    return `number:${this.value}`
  }

  toJSON(): { kind: 'number'; value: number } {
    return { kind: 'number', value: this.value }
  }
}