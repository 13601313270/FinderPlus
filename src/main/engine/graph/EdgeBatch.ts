import type { Value } from '../data/Value'
import type { Node } from '../node/Node'
import { InputPortManager } from '../port/InputPortManager'
import type { Edge } from './Edge'

/**
 * 边束：一组共享同一个"原子提交时刻"的 Edge。
 *
 * 用途：上游节点（如 PromiseAllNode）一次要向多个下游端口同步提交值时，
 * 不逐条调 edge.transferData，而是先把这些 edge 收进一个 EdgeBatch，
 * 再一次性调 transferData(values[])。EdgeBatch 内部按目标 Node 分组，
 * 对每个 Node 临时 new 一个 InputPortManager，把该 Node 的所有边 + 值
 * 作为一个批次交给 manager.receiveBatch——Manager 会把同一批次内的
 * N 个端口变化合并成一次 _onInputPortChanged 通知。
 *
 * 与 Edge.transferData（单条路径）完全解耦：两条路径互不干扰。
 * 暂未接入项目。
 */
export class EdgeBatch {
  constructor(readonly edges: readonly Edge[]) {}

  /** 批量传递值：按 edges 和 values 一一对应，按目标 Node 分组后交给各 Manager.receiveBatch */
  transferData(values: Value[], force = false): void {
    if (this.edges.length !== values.length) {
      throw new Error('[EdgeBatch.transferData] edges 和 values 长度不一致')
    }

    // 按目标 Node 分组
    const byOwner = new Map<Node, { edges: Edge[]; values: Value[] }>()

    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i]!
      const value = values[i]!
      const owner = edge.endPort.getOwner()
      if (!owner) continue
      const group = byOwner.get(owner) ?? { edges: [], values: [] }
      group.edges.push(edge)
      group.values.push(value)
      byOwner.set(owner, group)
    }

    // 每个目标 Node 临时 new 一个 Manager 来处理本批次
    for (const [owner, group] of byOwner) {
      const manager = new InputPortManager(owner)
      manager.receiveBatch(group.edges, group.values, force)
    }
  }

  /** 批量清空（对称预留） */
  transferClear(): void {
    const byOwner = new Map<Node, Edge[]>()

    for (const edge of this.edges) {
      const owner = edge.endPort.getOwner()
      if (!owner) continue
      const list = byOwner.get(owner) ?? []
      list.push(edge)
      byOwner.set(owner, list)
    }

    for (const [owner, edges] of byOwner) {
      const manager = new InputPortManager(owner)
      manager.receiveClearBatch(edges)
    }
  }
}
