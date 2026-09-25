import { Value } from '../data/Value'
import type { InputPort } from '../port/InputPort'
import type { OutputPort } from '../port/OutputPort'

/**
 * 边：一条连线本身，记住自己是「哪个输出端口 -> 哪个输入端口」。
 *
 * 两端在构造时就给定，所以边一诞生就是完整的，不存在「只配了一头」的边；
 * 构造与挂载统一由 EdgeBinder.connect 一次做完，别处不要自己 new。
 *
 * id 可选传入（从 DB 恢复时必须用存储的 id 重建），不传则自动生成（正常运行时）。
 */
export class Edge {
  readonly id: string

  constructor(
    readonly startPort: OutputPort,
    readonly endPort: InputPort,
    id?: string
  ) {
    this.id = id ?? `${startPort.id}→${endPort.id}-${Math.random().toString(36).slice(2, 8)}`
  }

  // 把数据从startPort端口传到endPort端口
  transferData(value: Value): void {
    this.endPort.receive(this, value)
  }

  // 把"清空值"信号从startPort传到endPort
  transferClear(): void {
    this.endPort.receiveClear(this)
  }
}