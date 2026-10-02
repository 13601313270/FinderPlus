import { BufferNode } from '../BufferNode/node'

/**
 * 栈节点：后进先出（LIFO）。
 * 「出」取缓冲区末尾（最后进入的那一项）。
 */
export class StackNode extends BufferNode {
  static readonly TYPE = 'stack'
  readonly type = StackNode.TYPE

  protected takeIndex(): number {
    return this.count - 1
  }
}