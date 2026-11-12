import { StringValue } from '../../engine/data/StringValue'
import { BoolValue } from '../../engine/data/BoolValue'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'

/** 节点默认 box 尺寸 */
const DEFAULT_BOX: [number, number] = [200, 130]

/** resize 时钳制的最小宽高 */
const MIN_W = 180
const MIN_H = 120

/** 接收方 ID 类型 */
export type ReceiveIdType = 'chat_id' | 'open_id' | 'user_id' | 'union_id' | 'email'

const ALL_RECEIVE_ID_TYPES: ReceiveIdType[] = ['chat_id', 'open_id', 'user_id', 'union_id', 'email']

/** 发送状态枚举 */
export type SendState = 'idle' | 'sending' | 'success' | 'error'

/**
 * 飞书消息发送节点：通过飞书开放平台 REST API 发送文本消息。
 *
 * 行为：
 * - 输入端口 text（StringValue）：消息内容
 * - 手动触发：点击节点卡片上的「发送」按钮；或 autoSend=true 时输入变更自动发
 * - 输出端口：sent（BoolValue 成功/失败）+ messageId（StringValue 飞书返回的消息 ID）
 * - 每次发送完（成功或失败）都会 commit 输出端口 + 通知 UI 更新状态
 *
 * 和 FeishuReceiveNode 共享飞书应用凭证，但 REST API 调用和 WS 长连接互不依赖。
 */
export class FeishuSendNode extends Node {
  static readonly TYPE = 'feishu-send'
  readonly type = FeishuSendNode.TYPE

  /** 输入端口：消息文本 */
  private readonly textPort: InputPort

  /** 输入端口：接收方 ID（外部传入时优先于面板配置） */
  private readonly receiveIdPort: InputPort

  /** 输入端口：接收方 ID 类型（外部传入时优先于面板配置） */
  private readonly receiveIdTypePort: InputPort

  /** 输出端口：发送是否成功 */
  private readonly sentPort: OutputPort

  /** 输出端口：飞书返回的 message_id（成功时） */
  private readonly messageIdPort: OutputPort

  // —— 用户配置 ——

  /** 飞书应用 App ID */
  private appId = ''

  /** 飞书应用 App Secret */
  private appSecret = ''

  /** 接收方 ID（群 chat_id 或用户 open_id 等） */
  private receiveId = ''

  /** 接收方 ID 类型 */
  private receiveIdType: ReceiveIdType = 'chat_id'

  /** 自动发送开关：输入文本变化时自动触发发送（默认 false，手动发送） */
  private autoSend = false

  // —— 运行时状态 ——

  /** 发送状态（UI 订阅用） */
  private sendState: SendState = 'idle'

  /** 发送错误信息（UI 展示用） */
  private sendError = ''

  /** 是否正在发送中——防抖，防按钮连点 */
  private sendingNow = false

  constructor(id: string) {
    super(id)
    // 输入端口
    this.textPort = new InputPort('text', {
      accepts: [StringValue],
      label: { zh: '消息', en: 'Text' }
    })
    this.receiveIdPort = new InputPort('receiveId', {
      accepts: [StringValue],
      label: { zh: '接收方ID', en: 'Receive ID' }
    })
    this.receiveIdTypePort = new InputPort('receiveIdType', {
      accepts: [StringValue],
      label: { zh: 'ID类型', en: 'ID Type' }
    })
    this.addInput(this.textPort)
    this.addInput(this.receiveIdPort)
    this.addInput(this.receiveIdTypePort)

    // 输出端口
    this.sentPort = new OutputPort('sent', BoolValue, { zh: '成功', en: 'Sent' })
    this.messageIdPort = new OutputPort('messageId', StringValue, { zh: '消息 ID', en: 'Message ID' })
    this.addOutput(this.sentPort)
    this.addOutput(this.messageIdPort)

    const [w, h] = DEFAULT_BOX
    this.setBox(w, h)
  }

  /** resize handle 拖拽时的最小尺寸钳制 */
  override setBox(width: number, height: number): void {
    super.setBox(Math.max(MIN_W, Math.round(width)), Math.max(MIN_H, Math.round(height)))
  }

  // —— Node 基类抽象方法 ——

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  /**
   * 输入端口变更：autoSend=true 时自动发送（仅真正 receive 到值时触发），
   * 绑线/断线/清空都不自动发。
   */
  inputPortReceiveValue(ports: InputPort[], source: InputPortChangeSource): void {
    this.notifyChanged()
    // 只有消息文本端口变更才触发自动发送——receiveId / receiveIdType 变更不触发
    if (this.autoSend && source === 'receive' && ports.includes(this.textPort)) {
      void this.triggerSend()
    }
  }

  // —— UI 读的状态 ——

  get displayAppId(): string { return this.appId }
  get displayAppSecret(): string { return this.appSecret }
  get displayReceiveId(): string { return this.receiveId }
  get displayReceiveIdType(): ReceiveIdType { return this.receiveIdType }
  get displayAutoSend(): boolean { return this.autoSend }
  get displaySendState(): SendState { return this.sendState }
  get displaySendError(): string { return this.sendError }
  get isSending(): boolean { return this.sendingNow }

  /** 下拉选项：所有合法的 receive_id_type */
  static readonly ALL_RECEIVE_ID_TYPES: ReceiveIdType[] = ALL_RECEIVE_ID_TYPES

  /**
   * 取当前生效的 receiveId：优先输入端口有值时用端口值，
   * 否则用面板手动配置的兜底值。
   */
  private getEffectiveReceiveId(): string {
    const vals = this.receiveIdPort.value
    if (vals.length > 0 && vals[0] instanceof StringValue) {
      const v = vals[0].value as string
      if (v) return v
    }
    return this.receiveId
  }

  /**
   * 取当前生效的 receiveIdType：优先输入端口有值时用端口值，
   * 否则用面板手动配置的兜底值。
   */
  private getEffectiveReceiveIdType(): ReceiveIdType {
    const vals = this.receiveIdTypePort.value
    if (vals.length > 0 && vals[0] instanceof StringValue) {
      const v = vals[0].value as string
      if (ALL_RECEIVE_ID_TYPES.includes(v as ReceiveIdType)) {
        return v as ReceiveIdType
      }
    }
    return this.receiveIdType
  }

  /** 获取当前 text 输入端口的值（或空字符串） */
  getCurrentText(): string {
    const vals = this.textPort.value
    if (vals.length === 0) return ''
    const first = vals[0]
    if (first instanceof StringValue) return first.value ?? ''
    return ''
  }

  // —— 配置修改 ——

  setAppId(v: string): void {
    if (this.appId === v) return
    this.appId = v.trim()
    this.notifyChanged()
  }

  setAppSecret(v: string): void {
    if (this.appSecret === v) return
    this.appSecret = v.trim()
    this.notifyChanged()
  }

  setReceiveId(v: string): void {
    if (this.receiveId === v) return
    this.receiveId = v.trim()
    this.notifyChanged()
  }

  setReceiveIdType(v: ReceiveIdType): void {
    if (this.receiveIdType === v) return
    this.receiveIdType = v
    this.notifyChanged()
  }

  setAutoSend(v: boolean): void {
    if (this.autoSend === v) return
    this.autoSend = v
    this.notifyChanged()
  }

  // —— 发送逻辑 ——

  /** 是否具备发送的所有前置条件 */
  private canSend(text: string): string | null {
    if (!this.appId || !this.appSecret) return '请先填写 App ID / Secret'
    if (!this.getEffectiveReceiveId()) return '请先填写接收方 ID'
    if (!text) return '消息内容为空'
    return null
  }

  /**
   * 手动/自动触发发送。
   * 防抖：正在发送中直接跳过，防止连点导致多次发送。
   */
  async triggerSend(): Promise<void> {
    if (this.sendingNow) return

    const text = this.getCurrentText()
    const err = this.canSend(text)
    if (err) {
      this.setSendState('error', err)
      this.sentPort.commit(new BoolValue(false), { force: true })
      this.messageIdPort.commit(new StringValue(''), { force: true })
      this.notifyChanged()
      return
    }

    this.sendingNow = true
    this.setSendState('sending', '')

    try {
      // @ts-ignore — 只在 renderer 里执行，window.feishuApi 一定存在
      const result = await window.feishuApi.send({
        appId: this.appId,
        appSecret: this.appSecret,
        receiveId: this.getEffectiveReceiveId(),
        receiveIdType: this.getEffectiveReceiveIdType(),
        text
      })

      if (result.ok) {
        this.setSendState('success', '')
        this.sentPort.commit(new BoolValue(true), { force: true })
        this.messageIdPort.commit(new StringValue(result.messageId ?? ''), { force: true })
      } else {
        this.setSendState('error', result.error)
        this.sentPort.commit(new BoolValue(false), { force: true })
        this.messageIdPort.commit(new StringValue(''), { force: true })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.setSendState('error', msg)
      this.sentPort.commit(new BoolValue(false), { force: true })
      this.messageIdPort.commit(new StringValue(''), { force: true })
    } finally {
      this.sendingNow = false
      this.notifyChanged()
    }
  }

  /** 更新发送状态（统一入口，顺带 notifyChanged 由调用方负责） */
  private setSendState(state: SendState, error = ''): void {
    if (this.sendState === state && this.sendError === error) return
    this.sendState = state
    this.sendError = error
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      ...super.saveState(),
      appId: this.appId,
      appSecret: this.appSecret,
      receiveId: this.receiveId,
      receiveIdType: this.receiveIdType,
      autoSend: this.autoSend
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    if (typeof state.appId === 'string') this.appId = state.appId
    if (typeof state.appSecret === 'string') this.appSecret = state.appSecret
    if (typeof state.receiveId === 'string') this.receiveId = state.receiveId
    if (typeof state.autoSend === 'boolean') this.autoSend = state.autoSend

    // receiveIdType 带类型校验
    const t = state.receiveIdType
    if (typeof t === 'string' && ALL_RECEIVE_ID_TYPES.includes(t as ReceiveIdType)) {
      this.receiveIdType = t as ReceiveIdType
    }

    this.notifyChanged()
  }
}
