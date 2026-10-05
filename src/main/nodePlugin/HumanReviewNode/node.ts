import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { FileValue } from '../../engine/data/FileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { Value } from '../../engine/data/Value'

const NODE_HEIGHT = 220

/**
 * 人工审核节点：接受所有现有 Value 子类，进入 FIFO 队列等待人工审核。
 *
 * 输出端口动态管理：
 * - 构造时无输出端口——没有上游就没有输出
 * - 上游首次传来值 → createOutputPorts（类型跟上游走）
 * - 上游类型变化 → rebuildOutputPorts（删掉旧的，自动断所有下游边，建新的）
 * - 上游清空 → deleteOutputPorts
 */
export class HumanReviewNode extends Node {
  static readonly TYPE = 'human-review'
  readonly type = HumanReviewNode.TYPE

  /** 输入端口：列出所有现有 Value 子类 */
  readonly input = new InputPort('input', {
    accepts: [NumberValue, StringValue, FileValue, JsonValue],
    label: {
      zh: '输入',
      en: 'Input',
      ja: '入力',
      ko: '입력',
      es: 'Entrada',
      ar: 'إدخال',
      fr: 'Entrée',
      pt: 'Entrada',
      ru: 'Ввод',
      hi: 'इनपुट',
      id: 'Masukan',
      de: 'Eingabe',
      vi: 'Đầu vào',
      tr: 'Giriş',
      it: 'Input'
    }
  })

  /** 输出端口引用；没有上游时为 undefined */
  approveOutput: OutputPort | undefined
  rejectOutput: OutputPort | undefined

  /** FIFO 待审核队列（不含当前正在审核的项） */
  private readonly queue: Value[] = []

  /** 当前正在审核的项，undefined 表示队列为空 */
  private current: Value | undefined

  constructor(id: string) {
    super(id)
    this.addInput(this.input)
    // 注意：构造时不加输出端口——等上游连上才动态创建
    this.setBox(220, NODE_HEIGHT)
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件拖入
  }

  // —— 渲染层读的状态 ——

  /** 当前正在审核的值的 displayLabel；无待审核时返回空串，占位文案由渲染层用 i18n 兜底 */
  get currentLabel(): string {
    return this.current?.displayLabel ?? ''
  }

  /** 队列中还有多少项（不含当前） */
  get pendingCount(): number {
    return this.queue.length
  }

  /** 是否有项正在审核（用于按钮 enable/disable） */
  get hasCurrent(): boolean {
    return this.current !== undefined
  }

  /** 当前正在审核的值实例（render.vue 用来判断 instanceof JsonValue 等） */
  get currentValue(): Value | undefined {
    return this.current
  }

  /** 是否已有输出端口（渲染层用来显示/隐藏右侧端口列） */
  get hasOutputPorts(): boolean {
    return this.approveOutput !== undefined
  }

  // —— 输入通知 & 端口管理 & 队列 ——

  inputPortReceiveValue(_ports: InputPort[]): void {
    const values = this.input.value
    const hasEdges = this.input.incomingEdgeCount > 0
    const upstreamClass = this.resolveUpstreamValueClass()

    if (!hasEdges) {
      // 上游完全断开 → 清队列 + 删输出端口
      this.queue.length = 0
      this.current = undefined
      if (this.approveOutput) {
        this.deleteOutputPorts()
      }
      this.notifyChanged()
      // 同步节点：队列空了 → stable
      this.completeRun()
      return
    }

    // —— 对齐输出端口：类型从 Edge 推算，不依赖 value 是否到达 ——
    if (upstreamClass) {
      if (!this.approveOutput) {
        this.createOutputPorts(upstreamClass)
      } else if (this.approveOutput.valueClass !== upstreamClass) {
        this.rebuildOutputPorts(upstreamClass)
      }
    }

    // 有连线但还没值 → 只对齐端口，不入队
    if (values.length === 0) {
      this.notifyChanged()
      // 同步节点：没有待审核项 → stable
      this.completeRun()
      return
    }

    // —— 入队 ——
    const value = values[0] // multiple: false，取第一个

    if (this.current === undefined) {
      this.current = value
    } else {
      this.queue.push(value)
    }
    this.notifyChanged()
    // 入队后保持 dirty——队列非空 = 有未处理的审核项，等 approve/reject 清空后 stable
  }

  /** 从 incoming 边推算上游 OutputPort 的类型（不要求值已到达） */
  private resolveUpstreamValueClass(): OutputPort['valueClass'] | undefined {
    for (const edge of this.input.incoming.keys()) {
      return edge.startPort.valueClass
    }
    return undefined
  }

  /** 首次有值时创建两个输出端口 */
  private createOutputPorts(valueClass: OutputPort['valueClass']): void {
    this.approveOutput = new OutputPort('approve', valueClass, {
      zh: '同意',
      en: 'Approve',
      ja: '承認',
      ko: '승인',
      es: 'Aprobar',
      ar: 'موافقة',
      fr: 'Approuver',
      pt: 'Aprovar',
      ru: 'Одобрить',
      hi: 'स्वीकारें',
      id: 'Setujui',
      de: 'Genehmigen',
      vi: 'Chấp thuận',
      tr: 'Onayla',
      it: 'Approva'
    })
    this.rejectOutput = new OutputPort('reject', valueClass, {
      zh: '拒绝',
      en: 'Reject',
      ja: '却下',
      ko: '거부',
      es: 'Rechazar',
      ar: 'رفض',
      fr: 'Rejeter',
      pt: 'Rejeitar',
      ru: 'Отклонить',
      hi: 'अस्वीकारें',
      id: 'Tolak',
      de: 'Ablehnen',
      vi: 'Từ chối',
      tr: 'Reddet',
      it: 'Rifiuta'
    })
    this.addOutput(this.approveOutput)
    this.addOutput(this.rejectOutput)
  }

  /** 类型变化时删掉旧端口（自动断下游边）+ 新建 */
  private rebuildOutputPorts(valueClass: OutputPort['valueClass']): void {
    if (!this.approveOutput || !this.rejectOutput) return
    this.removeOutput(this.approveOutput)
    this.removeOutput(this.rejectOutput)
    this.createOutputPorts(valueClass)
  }

  /** 上游清空时删掉两个输出端口 */
  private deleteOutputPorts(): void {
    if (this.approveOutput) {
      this.removeOutput(this.approveOutput)
      this.approveOutput = undefined
    }
    if (this.rejectOutput) {
      this.removeOutput(this.rejectOutput)
      this.rejectOutput = undefined
    }
  }

  // —— 人工操作 ——

  /** 同意当前项：commit 到 approveOutput，然后取下一个 */
  approve(): void {
    if (!this.current || !this.approveOutput) return
    this.approveOutput.commit(this.current)
    this.advance()
  }

  /** 拒绝当前项：commit 到 rejectOutput，然后取下一个 */
  reject(): void {
    if (!this.current || !this.rejectOutput) return
    this.rejectOutput.commit(this.current)
    this.advance()
  }

  /** 从队列取下一个成为当前项；队列为空则 current 置 undefined */
  private advance(): void {
    this.current = this.queue.shift()
    this.notifyChanged()
    // 队列清空 → 所有项都审核完了 → stable
    if (this.current === undefined) {
      this.completeRun()
    }
  }

  // —— 持久化 ——

  /** 队列不持久化，恢复时上游重新 commit 自动重建；输出端口动态重建 */
  saveState(): Record<string, unknown> {
    return {}
  }

  readState(_state: Record<string, unknown>): void {
    // 队列和输出端口都由上游重新 commit 时自动重建
  }
}
