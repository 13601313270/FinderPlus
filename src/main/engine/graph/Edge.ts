import { Value } from '../data/Value'
import type { InputPort } from '../port/InputPort'
import type { OutputPort } from '../port/OutputPort'

/**
 * 边：一条连线本身，记住自己是「哪个输出端口 -> 哪个输入端口」。
 *
 * 两端在构造时就给定，所以边一诞生就是完整的，不存在「只配了一头」的边；
 * 构造与挂载统一由 EdgeBinder.connect 一次做完，别处不要自己 new。
 */
export class Edge {
  constructor(
    readonly startPort: OutputPort,
    readonly endPort: InputPort
  ) {}

  // 把数据从startPort端口传到endPort端口
  transferData(value: Value): void {
    this.endPort.receive(this, value)
  }
}