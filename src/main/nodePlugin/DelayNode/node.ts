import { BoolValue } from '../../engine/data/BoolValue'
import { FileValue } from '../../engine/data/FileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { TxtFileValue } from '../../engine/data/TxtFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { inLabel, outLabel } from './i18n'

/** 默认延时毫秒 */
const DEFAULT_DELAY_MS = 1000

/** 最小延时毫秒（避免 0ms 竞态） */
const MIN_DELAY_MS = 0

/** 最大延时毫秒（1 小时） */
const MAX_DELAY_MS = 60 * 60 * 1000

/**
 * 延时节点（Delay）：在 WireNode（透传节点）的基础上加一个时间闸门。
 *
 * 行为：
 * - 输入端口接受所有内置 Value 子类，输出端口**连线建立时按上游 startPort.valueClass 对齐**
 *   （与 WireNode / HumanReviewNode 同构——不依赖上游是否已 commit 值）
 * - 值到达后**不立即透传**，而是等 delayMs 毫秒后再 commit 到输出端口
 * - 等待期间上游又推了新值 → latest-wins：取消旧 timer，用新值重新计时
 * - 等待期间上游断开 → 取消 timer，删输出端口
 * - 节点被删除 → beforeDestroy 里 clearTimeout，防止泄漏
 *
 * 与 WireNode 唯一的区别就是 setTimeout 包裹了 commit；端口管理 / readState 逻辑抄 WireNode。
 */
export class DelayNode extends Node {
  static readonly TYPE = 'delay'
  readonly type = DelayNode.TYPE

  /** 所有内置 Value 子类 */
  private static readonly ALL_VALUE_CLASSES = [
    StringValue, NumberValue, BoolValue, JsonValue, FileValue, ImgFileValue, TxtFileValue
  ]

  /** 输入端口 */
  private readonly inputPort: InputPort

  /** 输出端口；有连线时存在 */
  private outputPort: OutputPort | undefined

  /** 延时毫秒数 */
  private delayMs = DEFAULT_DELAY_MS

  /** 当前挂起的 timeout id；undefined 表示没有在等 */
  private pendingTimer: ReturnType<typeof setTimeout> | undefined

  /** 等待期间被取消过的标志（上游断连 / 节点销毁用来让 timer 回调自己失效） */
  private cancelled = false

  constructor(id: string) {
    super(id)
    this.inputPort = new InputPort('in', {
      accepts: DelayNode.ALL_VALUE_CLASSES,
      label: inLabel
    })
    this.addInput(this.inputPort)
    // header(~24px) + 内容区(~50px)
    this.setBox(120, 60)
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  // —— 渲染层读的状态 ——

  /** 当前输出端口的类型标签；还没建 outputPort 时返回空串 */
  get displayTypeName(): string {
    return this.outputPort?.outputValueName ?? ''
  }

  /** 是否已有输出端口 */
  get hasOutputPort(): boolean {
    return this.outputPort !== undefined
  }

  /** 当前延时毫秒数（UI 读） */
  get displayDelayMs(): number {
    return this.delayMs
  }

  /** 是否正在等待（UI 可以显示一个 loading 样式） */
  get isPending(): boolean {
    return this.pendingTimer !== undefined
  }

  // —— 配置修改 ——

  /** 设置延时毫秒；夹到合法区间 */
  setDelayMs(ms: number): void {
    const clamped = Math.max(MIN_DELAY_MS, Math.min(MAX_DELAY_MS, Math.round(ms)))
    if (clamped === this.delayMs) return
    this.delayMs = clamped
    this.notifyChanged()
  }

  // —— 输入：对齐端口 + 启动 / 重置 timer ——

  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    const hasEdges = this.inputPort.incomingEdgeCount > 0
    const upstreamClass = this.resolveUpstreamValueClass()

    if (!hasEdges) {
      // 上游完全断开 → 取消等待 + 删输出端口
      this.clearPendingTimer()
      this.deleteOutputPort()
      this.notifyChanged()
      this.completeRun()
      return
    }

    // —— 按上游连线的类型对齐输出端口 ——
    if (upstreamClass) {
      if (!this.outputPort) {
        this.createOutputPort(upstreamClass)
      } else if (this.outputPort.valueClass !== upstreamClass) {
        this.rebuildOutputPort(upstreamClass)
      }
    }

    // —— 取最新值 ——
    const [value] = this.inputPort.value
    if (value === undefined) {
      // 有连线但还没值 → 只对齐端口
      this.notifyChanged()
      this.completeRun()
      return
    }

    // —— latest-wins：取消旧 timer，重新开始计时 ——
    this.clearPendingTimer()
    this.cancelled = false
    this.notifyChanged() // 让 UI 看到 pending

    if (this.delayMs <= 0) {
      // 延时为 0 → 直接 commit（跳过 setTimeout，省去异步间隙）
      this.outputPort!.commit(value, { force: true })
      this.notifyChanged()
      this.completeRun()
      return
    }

    // 有延时 → beginRun 标记 running，setTimeout 收口
    this.beginRun()
    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = undefined
      if (this.cancelled) {
        // 被 clearPendingTimer 标记过（上游断开/节点销毁），不再 commit
        return
      }
      // commit 用"当时快照的值"——上游这期间又推了新值的话，clearPendingTimer
      // 会在 inputPortReceiveValue 里先调过了，这里走到就是最后一个 timer
      if (this.outputPort) {
        this.outputPort.commit(value, { force: true })
      }
      this.notifyChanged()
      this.completeRun()
    }, this.delayMs)
  }

  /** 从 incoming 边推算上游 OutputPort 的类型（不要求值已到达） */
  private resolveUpstreamValueClass(): OutputPort['valueClass'] | undefined {
    for (const edge of this.inputPort.incoming.keys()) {
      return edge.startPort.valueClass
    }
    return undefined
  }

  /** 按给定 valueClass 创建输出端口 */
  private createOutputPort(valueClass: OutputPort['valueClass']): void {
    this.outputPort = new OutputPort('out', valueClass, outLabel)
    this.addOutput(this.outputPort)
  }

  /** 上游类型变了 → 拆旧建新（旧下游边随 removeOutput 自动断开） */
  private rebuildOutputPort(valueClass: OutputPort['valueClass']): void {
    if (!this.outputPort) return
    this.removeOutput(this.outputPort)
    this.outputPort = undefined
    this.createOutputPort(valueClass)
  }

  /** 上游全断 → 删输出端口 */
  private deleteOutputPort(): void {
    if (this.outputPort) {
      this.removeOutput(this.outputPort)
      this.outputPort = undefined
    }
  }

  /** 清掉挂起的 timer，并标记 cancelled，让已排队的回调自己废掉 */
  private clearPendingTimer(): void {
    if (this.pendingTimer !== undefined) {
      clearTimeout(this.pendingTimer)
      this.pendingTimer = undefined
      this.cancelled = true
    }
  }

  // —— 生命周期 ——

  /** 节点被删前清理 timer，防止"删了节点还 commit 值"泄漏 */
  beforeDestroy(): void {
    this.clearPendingTimer()
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return { delayMs: this.delayMs }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.delayMs === 'number') {
      this.delayMs = Math.max(MIN_DELAY_MS, Math.min(MAX_DELAY_MS, Math.round(state.delayMs)))
    }
    // 端口由上游连线动态重建，不需要持久化
  }
}
