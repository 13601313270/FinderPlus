/**
 * 传输子基类：节点输出端口流出、输入端口流入的数据。
 *
 * 三条铁律：
 * 1. 不可变：值一旦产生就不再改动（只读字段），缓存与脏标记比对都建立在这上面
 * 2. 自描述：每个值都知道自己的类型标签，端口靠它做兼容判断
 * 3. 不见字节：文件/图片这类大对象只携带句柄，真正的字节在资产库里
 */
export type ValueKind = 'number' | 'string' | 'file'

export abstract class Value {
  /** 类型标签，端口的 accepts 判断与下游节点的分支都靠它 */
  abstract readonly kind: ValueKind

  /**
   * 内容指纹：内容相同则指纹相同。
   * 上游靠它判断「我这次重算后到底有没有变」，端口靠它决定要不要往派发；
   * 同时它也是执行缓存键的一部分。
   */
  abstract get fingerprint(): string

  /**
   * 纯数据形式（只含句柄，不含字节）。
   * 用于 IPC 传给渲染进程、写日志、调试快照。
   */
  abstract toJSON(): { kind: ValueKind }

  /** 值相等 = 类型相同且指纹相同 */
  equals(other: Value | null | undefined): boolean {
    return other != null && other.kind === this.kind && other.fingerprint === this.fingerprint
  }
}