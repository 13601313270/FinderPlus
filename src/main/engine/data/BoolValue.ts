import { Value, type ValueKind } from './Value'

/** 布尔传输子 */
export class BoolValue extends Value {
  static override readonly VALUE_NAME: ValueKind = 'bool'

  readonly fingerprint: string

  constructor(readonly value: boolean) {
    super()
    this.fingerprint = `bool:${value}`
  }

  override get displayLabel(): string {
    return String(this.value)
  }
}