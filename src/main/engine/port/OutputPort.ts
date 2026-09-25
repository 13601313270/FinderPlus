import type { Value, ValueKind } from '../data/Value'
import type { Edge } from '../graph/Edge'
import type { Node } from '../node/Node'

/** 任何带 VALUE_NAME 静态属性的 Value 子类 */
type ValueClass = { readonly VALUE_NAME: ValueKind; prototype: Value; new (...args: any[]): Value }

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

  /** 所属节点，由 Node 登记端口时注入 */
  private owner: Node | undefined

  /** 本端口产出的 Value 子类 */
  readonly valueClass: ValueClass

  /** 本端口产出的类型标签名（valueClass.VALUE_NAME 的快捷访问，供 UI 展示） */
  readonly outputValueName: ValueKind

  constructor(
    readonly id: string,
    /** 本端口产出的 Value 子类，端口自动从其静态 VALUE_NAME 取类型标签 */
    valueClass: ValueClass,
    /** 端口文本标记，UI 显示用；不填则回退到 id */
    readonly label?: string
  ) {
    this.valueClass = valueClass
    this.outputValueName = valueClass.VALUE_NAME
  }

  get value(): Value | undefined {
    return this.currentValue
  }

  /** 认领：由 Node 登记端口时调用。让端口能反查所属节点（Edge 存 DB 时需要 start_node_id） */
  setOwner(owner: Node): void {
    this.owner = owner
  }

  /** 取所属节点，可能为 undefined（极端情况下端口未被 Node 认领） */
  getOwner(): Node | undefined {
    return this.owner
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
