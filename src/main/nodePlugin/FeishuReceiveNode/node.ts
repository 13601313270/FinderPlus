import { StringValue } from '../../engine/data/StringValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'
import type { FeishuMessagePayload } from '../../feishu/FeishuManager'

/** 节点默认 box 尺寸 */
const DEFAULT_BOX: [number, number] = [220, 140]

/** resize 时钳制的最小宽高 */
const MIN_W = 180
const MIN_H = 120

/** WSClient 连接状态枚举 */
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error'

/**
 * 飞书消息接收节点：通过飞书开放平台长连接（WebSocket）实时接收飞书消息。
 *
 * 架构说明：
 * - WS 长连接在**主进程** FeishuManager 里维护（SDK 是 Node.js 独占包，renderer 没有 node:http）
 * - renderer 侧节点只负责：调 preload 暴露的 feishuApi 启动/停止、注册消息回调、commit 输出端口
 * - 主进程收到消息后通过 'feishu:message' IPC 事件广播给所有窗口
 * - 同一时刻只允许一组 App 凭证在连（主进程单例 FeishuManager）；多节点用不同凭证会互相抢占
 *
 * 行为：
 * - 源头节点：没有输入端口，只有一个 StringValue 输出端口
 * - 仅处理文本消息（msg_type = 'text'），非文本消息在主进程已过滤
 * - message_id 去重由主进程完成，renderer 无需重复处理
 * - 启停开关关闭时断开长连接，开启时重连
 *
 * 前置条件（用户需自行在飞书开放平台完成）：
 * 1. 创建企业自建应用
 * 2. 在「事件与回调 > 事件配置」里选择「使用长连接接收事件」
 * 3. 添加订阅事件：接收消息 v2.0（im.message.receive_v1）
 * 4. 机器人能力开启，并把机器人拉进目标群
 * 5. 配置 appId / appSecret 填入本节点
 */
export class FeishuReceiveNode extends Node {
  static readonly TYPE = 'feishu-receive'
  readonly type = FeishuReceiveNode.TYPE

  /** 输出端口：消息文本 */
  private readonly messagePort: OutputPort

  /** 输出端口：发送人 ID（open_id / user_id / union_id / email，取 sender_id 中第一个有值的字段） */
  private readonly senderPort: OutputPort

  /** 输出端口：发送人 ID 类型（open_id / user_id / union_id / email） */
  private readonly senderIdTypePort: OutputPort

  // —— 用户配置 ——

  /** 飞书应用 App ID */
  private appId = ''

  /** 飞书应用 App Secret */
  private appSecret = ''

  /** 是否启用接收（持久化；默认 false，防止空凭证也自动重连） */
  private enabled = false

  /**
   * 可选的 chat_id 过滤。
   * 非空时只处理来自该群的消息；空则接收所有群/单聊消息。
   */
  private chatIdFilter = ''

  // —— 运行时状态 ——

  /** 当前连接状态（UI 订阅用） */
  private connectionState: ConnectionState = 'idle'

  /** 连接错误信息（UI 展示用） */
  private connectionError = ''

  /** 消息事件订阅取消函数——停止时调用 */
  private messageUnsubscribe: (() => void) | null = null

  /** 状态轮询定时器——主进程没有显式状态变更回调，renderer 轮询 getStatus */
  private statusPollTimer: ReturnType<typeof setInterval> | null = null

  constructor(id: string) {
    super(id)
    this.messagePort = new OutputPort('message', StringValue, { zh: '消息', en: 'Message' })
    this.senderPort = new OutputPort('sender', StringValue, { zh: '发送人', en: 'Sender' })
    this.senderIdTypePort = new OutputPort('senderIdType', StringValue, { zh: '发送人ID类型', en: 'Sender ID Type' })
    this.addOutput(this.messagePort)
    this.addOutput(this.senderPort)
    this.addOutput(this.senderIdTypePort)
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

  /** 源头节点，没有输入端口 */
  inputPortReceiveValue(_ports: InputPort[]): void {}

  // —— UI 读的状态 ——

  get displayAppId(): string { return this.appId }
  get displayAppSecret(): string { return this.appSecret }
  get displayChatIdFilter(): string { return this.chatIdFilter }
  get isEnabled(): boolean { return this.enabled }
  get displayConnectionState(): ConnectionState { return this.connectionState }
  get displayConnectionError(): string { return this.connectionError }

  // —— 配置修改 ——

  setAppId(v: string): void {
    if (this.appId === v) return
    this.appId = v.trim()
    this.notifyChanged()
    if (this.enabled) this.restartConnection()
  }

  setAppSecret(v: string): void {
    if (this.appSecret === v) return
    this.appSecret = v.trim()
    this.notifyChanged()
    if (this.enabled) this.restartConnection()
  }

  setChatIdFilter(v: string): void {
    const trimmed = v.trim()
    if (this.chatIdFilter === trimmed) return
    this.chatIdFilter = trimmed
    this.notifyChanged()
  }

  setEnabled(v: boolean): void {
    if (this.enabled === v) return
    this.enabled = v
    if (v) this.startConnection()
    else this.stopConnection()
    this.notifyChanged()
  }

  toggleEnabled(): void {
    this.setEnabled(!this.enabled)
  }

  // —— 长连接管理 ——

  /** 是否具备启动连接的所有前置条件 */
  private canStart(): boolean {
    return this.appId.length > 0 && this.appSecret.length > 0
  }

  /**
   * 启动长连接：调主进程 feishuApi.start() + 注册消息回调。
   * 主进程 FeishuManager 是单例——同一时刻一组 App 凭证在连；换凭证会自动关旧起新。
   */
  startConnection(): void {
    if (!this.canStart()) {
      this.setConnectionState('error', '请先填写 App ID 和 App Secret')
      return
    }

    // 已经在监听了就跳过（startConnection 可能被 onReady 和用户开关各调一次）
    if (this.messageUnsubscribe !== null) return

    this.setConnectionState('connecting')

    // 注册消息回调——主进程 WS 连接建好后收到消息就会广播过来
    // @ts-ignore — 只在 renderer 里执行，window.feishuApi 一定存在
    this.messageUnsubscribe = window.feishuApi.onMessage((payload) => {
      this.handleFeishuMessage(payload)
    })

    // 通知主进程启动 WS
    // @ts-ignore — 只在 renderer 里执行，window.feishuApi 一定存在
    void window.feishuApi.start({ appId: this.appId, appSecret: this.appSecret }).then((result) => {
      if (!result.ok) {
        this.setConnectionState('error', result.error)
        this.cleanupMessageListener()
      }
      // ok=true 但实际连接还在建立中，进入下面的轮询看真实状态
    })

    // 轮询主进程状态：每 1 秒查一次，最多 10 秒，有结果就停
    // 轮询是为了把主进程 FeishuManager 的 state 同步到 renderer UI
    this.statusPollTimer = setInterval(() => {
      // @ts-ignore — 只在 renderer 里执行，window.feishuApi 一定存在
      void window.feishuApi.getStatus().then((status) => {
        // 只有状态变化才更新——避免无意义的 notifyChanged
        this.setConnectionState(status.state, status.error ?? '')
        if (status.state === 'connected' || status.state === 'error' || status.state === 'idle') {
          // 终态，停轮询
          this.stopStatusPoll()
        }
      })
    }, 1000)

    // 10 秒兜底：不管什么状态都停轮询（防止主进程一直卡在 connecting）
    setTimeout(() => {
      this.stopStatusPoll()
    }, 10000)
  }

  /** 关闭长连接：清消息订阅 + 轮询 + 通知主进程 stop */
  stopConnection(): void {
    this.cleanupMessageListener()
    this.stopStatusPoll()

    // 通知主进程停（只对最后一个调用生效——主进程单例，谁最后停谁说了算）
    // @ts-ignore — 只在 renderer 里执行，window.feishuApi 一定存在
    void window.feishuApi.stop()

    this.setConnectionState('idle')
  }

  /** 清理消息监听 */
  private cleanupMessageListener(): void {
    if (this.messageUnsubscribe !== null) {
      this.messageUnsubscribe()
      this.messageUnsubscribe = null
    }
  }

  /** 停状态轮询定时器 */
  private stopStatusPoll(): void {
    if (this.statusPollTimer !== null) {
      clearInterval(this.statusPollTimer)
      this.statusPollTimer = null
    }
  }

  /** 凭证变更时重启连接：先关后开 */
  private restartConnection(): void {
    this.stopConnection()
    if (this.enabled && this.canStart()) {
      this.startConnection()
    }
  }

  /** 更新连接状态（统一入口，顺带 notifyChanged） */
  private setConnectionState(state: ConnectionState, error = ''): void {
    if (this.connectionState === state && this.connectionError === error) return
    this.connectionState = state
    this.connectionError = error
    this.notifyChanged()
  }

  // —— 消息处理 ——

  /**
   * 处理主进程推过来的飞书消息。
   *
   * 主进程已完成：message_type='text' 过滤、message_id 去重。
   * 这里只需要：chat_id 过滤 → commit 输出端口。
   */
  private handleFeishuMessage(payload: FeishuMessagePayload): void {
    // chat_id 过滤：用户配置了 chatIdFilter 且不匹配 → 跳过
    if (this.chatIdFilter && payload.chatId !== this.chatIdFilter) return

    // commit 输出端口（force: true 确保即使值相同也推给下游）
    this.messagePort.commit(new StringValue(payload.text), { force: true })
    this.senderPort.commit(new StringValue(payload.senderId), { force: true })
    this.senderIdTypePort.commit(new StringValue(payload.senderIdType), { force: true })
    this.notifyChanged()
  }

  // —— 生命周期钩子 ——

  /**
   * 删除节点前主动断开长连接——
   * 防止消息监听回调还在后台跑。
   */
  beforeDestroy(): void {
    this.stopConnection()
  }

  saveState(): Record<string, unknown> {
    return {
      ...super.saveState(),
      appId: this.appId,
      appSecret: this.appSecret,
      enabled: this.enabled,
      chatIdFilter: this.chatIdFilter
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    if (typeof state.appId === 'string') this.appId = state.appId
    if (typeof state.appSecret === 'string') this.appSecret = state.appSecret
    if (typeof state.chatIdFilter === 'string') this.chatIdFilter = state.chatIdFilter
    // enabled 默认 false——防止旧存量节点升级后自动重连（需要用户手动确认）
    this.enabled = state.enabled === true

    // 恢复后自动启动（如果用户保存时开启了）
    if (this.enabled && this.canStart()) {
      this.startConnection()
    }

    this.notifyChanged()
  }
}
