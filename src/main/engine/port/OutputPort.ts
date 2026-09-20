import type { Value, ValueKind } from '../data/Value'
import type { Edge } from '../graph/Edge'

/**
 * 输出端口：节点产出值的出口。
 * 端口不持有字节，只记住「我的值是什么、是否过期、通向哪些连线」。
 */
export class OutputPort {
  /**
   * 挂在本端口上的下游连线。值只有一份，边可以有多条。
   *
   * 连线的增删一律由 EdgeBinder 收口，这里只是它要写的存储。
   * 语言层面没法限制只有它可写，靠这条约定守着——别在别处直接 add / delete。
   */
  readonly edges = new Set<Edge>()

  /** 当前值，undefined 表示该节点从未计算过 */
  private currentValue: Value | undefined

  constructor(
    readonly id: string,
    /** 本端口产出的类型，连线校验与端口样式都用它 */
    readonly kind: ValueKind
  ) { }

  get value(): Value | undefined {
    return this.currentValue
  }

  /**
   * 提交一次计算结果，返回「本次是否真的变了」——按指纹比对，而不是按引用。
   * 引擎只在返回 true 时沿 edges 向后派发，这就是整条脏传播链的起点。
   */
  commit(value: Value): boolean {
    const changed = this.currentValue?.fingerprint !== value.fingerprint
    this.currentValue = value
    if (changed) {
      // 通知Edge有新的值
      this.edges.forEach(edge => edge.transferData(value))
    }
    return changed
  }
}