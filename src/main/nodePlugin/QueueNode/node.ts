import { BufferNode } from '../BufferNode/node'

/**
 * 队列节点：先进先出（FIFO）。
 * 「出」取缓冲区队首（最早进入的那一项）。
 */
export class QueueNode extends BufferNode {
  static readonly TYPE = 'queue'
  readonly type = QueueNode.TYPE

  protected takeIndex(): number {
    return 0
  }
}