import { Value } from '../data/Value'
import { InputPort, type InputPortBindRejectReason } from './InputPort'
import type { Edge } from '../graph/Edge'
import type { OutputPort } from './OutputPort'

/** 方法端口选项：比 InputPort 简单——不需要 accepts（接受所有类型）、不需要 required/defaultValue */
export interface MethodPortOptions {
  /** 端口文本标记（多语言），UI 显示用 */
  readonly label?: import('../../../shared/language').LocalizedText
}

/**
 * 方法端口：节点"暴露出来让外部触发内部方法"的入口。
 *
 * 语义上它是"一次性触发信号"，不是"持续有值"的输入：
 * - 上游 OutputPort commit 任何值过来 → 触发一次 MethodPort 的回调
 * - 不关心上游送来什么 Value 子类，内部自己决定怎么用
 * - 默认允许多条连线接入
 * - 跳过 fingerprint 去重——每次上游 commit 都视为一次新的触发
 *
 * 实现上继承 InputPort，复用 Edge / EdgeBinder / EdgeBinding 的全部基础设施。
 * 有两处行为差异：
 * 1. canBindEdge 跳过类型检查——接受任何 OutputPort
 * 2. 重写 receive 绕过 fingerprint 去重 + 派发 trigger 回调
 *
 * 方法端口不参与 dirty/stable 追踪——它是触发器，不是计算链路的一环。
 * 所属 Node 在 _onInputPortChanged 里收到通知后应直接触发回调（而非走脏标记流程）。
 */
export class MethodPort extends InputPort {
  /** 订阅本端口触发事件的回调集合 */
  private readonly triggerListeners = new Set<() => void>()

  constructor(
    readonly id: string,
    options: MethodPortOptions = {}
  ) {
    // 传给基类：空 accepts（基类会说"不接受任何类型"——但我们 override canBindEdge 放行所有）
    super(id, {
      accepts: [],
      label: options.label
    })
  }

  /**
   * 方法端口接受任何 OutputPort 的连接——不做类型过滤。
   * （同一条边不重复连接的约束由 EdgeBinder.hasEdgeBetween 保证）
   */
  override canBindEdge(_startPort: OutputPort): { result: true } | { result: false; message: InputPortBindRejectReason } {
    return { result: true }
  }

  /**
   * 重写 receive：每次上游 commit 都视为一次新的触发——跳过 fingerprint 比对，
   * 每次都通知 owner 并派发 trigger 回调。
   *
   * InputPort 的 fingerprint 去重针对的是"值没变就不用重算"的计算型语义，
   * 而方法端口是"每次信号都触发一次动作"，所以必须绕过。
   */
  override receive(edge: Edge, value: Value, _force = false): void {
    this.incoming.set(edge, value)
    // 每次都通知 owner——不等 fingerprint 比对
    if (this.locked) {
      this.pendingNotify = true
    } else {
      this.owner?._onInputPortChanged([this], 'receive')
    }
    // 派发 trigger 回调
    this.notifyTrigger()
  }

  /**
   * 订阅本端口的触发事件。每次上游 commit 都会被调用一次（不等 fingerprint 去重）。
   * 返回取消订阅函数。
   */
  onTrigger(fn: () => void): () => void {
    this.triggerListeners.add(fn)
    return () => {
      this.triggerListeners.delete(fn)
    }
  }

  /**
   * 执行所有已注册的触发回调。
   * 供所属 Node 或 receive 内部调用。
   */
  trigger(): void {
    this.notifyTrigger()
  }

  private notifyTrigger(): void {
    this.triggerListeners.forEach(fn => fn())
  }
}
