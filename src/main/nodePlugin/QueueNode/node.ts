import { MethodPort } from '../../engine/port/MethodPort'
import { clearLabel } from '../BufferNode/i18n'
import { BufferNode } from '../BufferNode/node'

/**
 * 队列节点：先进先出（FIFO）。
 * 「出」取缓冲区队首（最早进入的那一项）。
 * 额外提供「清空」方法端口，一键移除队列中全部条目。
 */
export class QueueNode extends BufferNode {
  static readonly TYPE = 'queue'
  readonly type = QueueNode.TYPE

  constructor(id: string) {
    super(id)
    const clearPort = new MethodPort('clear', { label: clearLabel })
    this.addMethod(clearPort)
    clearPort.onTrigger(() => this.clear())
  }

  protected takeIndex(): number {
    return 0
  }
}
