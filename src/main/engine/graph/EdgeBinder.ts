import type { InputPort, InputPortBindRejectReason } from '../port/InputPort'
import type { OutputPort } from '../port/OutputPort'
import { Edge } from './Edge'

/** 连不上的原因。文案交给 UI，引擎只给判定 */
export type BindRejectReason = 'already-bound'

export type ConnectResult =
  | { readonly ok: true; readonly edge: Edge }
  | { readonly ok: false; readonly reason: BindRejectReason | InputPortBindRejectReason }

/**
 * 绑定关系类：连线关系的唯一写入方。
 *
 * 一条边要同时挂到两个端口上（输出端口的 edges、输入端口的 incoming），
 * 这几个指针必须一起生一起灭，所以增删都收口在这里，别处不许动端口的这两个集合。
 *
 * 注意：成环检测不在这里。判断「从 B 出发能不能绕回 A」需要知道端口属于哪个节点，
 * 那是图层的知识，由上层在调用 connect 之前先判掉。
 */
export class EdgeBinder {
  /**
   * 建立连线：四个指针在这里一次写完
   * 1、输出端口挂上这条边
   * 2、输入端口挂上这条边（值先占位成 undefined，要等上游算完）
   * 3、边记住自己的起点端口
   * 4、边记住自己的终点端口
   *
   * 3、4 由 Edge 的构造参数完成，所以边一诞生就是两端完整的，不存在只配了一头的中间态；
   * 而且在返回之前没有任何人拿到这条边，外界看不到半成品。
   */
  connect(startPort: OutputPort, endPort: InputPort): ConnectResult {
    if (this.hasEdgeBetween(startPort, endPort)) {
      return { ok: false, reason: 'already-bound' }
    }
    const edge = new Edge(startPort, endPort)
    const result = endPort.canBindEdge(startPort)
    if (result.result === false) {
      return { ok: false, reason: result.message }
    }

    startPort.edges.add(edge)
    endPort.bindEdge(edge)

    // 连上时上游可能已经算过值，同步补送一次，让下游的输入值立刻与图结构一致。
    // 只补「值」，不触发「算」——重算由调度层按自己的节奏来。
    if (startPort.value !== undefined) {
      edge.transferData(startPort.value)
    }
    return { ok: true, edge }
  }

  /**
   * 断开连线：两端一律从边自身读，调用方不需要（也没机会）传错端口。
   * 输入侧连值带关系一起丢掉——输入集合变了，下游得知道自己可以重算（通知节点待补）。
   */
  disconnect(edge: Edge): void {
    edge.startPort.edges.delete(edge)
    edge.endPort.unbindEdge(edge)
  }

  /**
   * 同一对端口之间只允许一条边。
   * 多值端口是无序集合，「同一个上游接两根线」等于同一个值在集合里出现两次，没有意义。
   */
  private hasEdgeBetween(startPort: OutputPort, endPort: InputPort): boolean {
    let found = false
    startPort.edges.forEach((edge) => {
      if (edge.endPort === endPort) found = true
    })
    return found
  }
}