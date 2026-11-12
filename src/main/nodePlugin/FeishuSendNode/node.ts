import { StringValue } from '../../engine/data/StringValue'
import { BoolValue } from '../../engine/data/BoolValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { VideoFileValue } from '../../engine/data/VideoFileValue'
import { FileValue } from '../../engine/data/FileValue'
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
 * - 输入端口 receiveId（StringValue）：接收方 ID（外部传入优先于面板）
 * - 输入端口 receiveIdType（StringValue）：接收方 ID 类型（外部传入优先于面板）
 * - 手动触发：点击节点卡片上的「发送」按钮；或 autoSend=true 时输入变更自动发
 * - 输出端口：sent（BoolValue 成功/失败）+ messageId（StringValue 飞书返回的消息 ID）
 *
 * 飞书应用凭证（App ID / Secret）统一在设置 → 飞书机器人里配置，
 * 节点只存 botId（引用全局列表），不再独立存 appId/appSecret。
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

  /** 全局机器人 id（引用 SettingsDialog 里的飞书机器人列表） */
  private botId = ''

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
      accepts: [StringValue, FileValue],
      label: { zh: '消息', en: 'Message' }
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

  get displayBotId(): string { return this.botId }
  get displayReceiveId(): string { return this.receiveId }
  get displayReceiveIdType(): ReceiveIdType { return this.receiveIdType }
  get displayAutoSend(): boolean { return this.autoSend }
  get displaySendState(): SendState { return this.sendState }
  get displaySendError(): string { return this.sendError }
  get isSending(): boolean { return this.sendingNow }

  /** 下拉选项：所有合法的 receive_id_type */
  static readonly ALL_RECEIVE_ID_TYPES: ReceiveIdType[] = ALL_RECEIVE_ID_TYPES

  /**
   * 从 botId 反查凭证；找不到返回 null。
   * 底层读 localStorage（和 SettingsDialog 里的全局机器人列表同源）。
   */
  private resolveCredentials(): { appId: string; appSecret: string } | null {
    // @ts-ignore — 只在 renderer 里执行，window.feishuApi 一定存在
    return window.feishuApi.resolveBotCredentials(this.botId)
  }

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

  /**
   * 取当前 text 输入端口的值（或空字符串）
   * 仅当上游是 StringValue 时返回文本，图片类型返回空串
   */
  getCurrentText(): string {
    const vals = this.textPort.value
    if (vals.length === 0) return ''
    const first = vals[0]
    if (first instanceof StringValue) return first.value ?? ''
    return ''
  }

  /**
   * 获取当前消息的实际类型：
   * - 'text'：StringValue 或无值
   * - 'image'：ImgFileValue
   * - 'audio'：AudioFileValue
   * - 'media'：VideoFileValue
   * - 'file'：其他 FileValue（PdfFileValue/TxtFileValue 等）
   */
  private getCurrentMsgType(): 'text' | 'image' | 'audio' | 'media' | 'file' {
    const vals = this.textPort.value
    if (vals.length === 0) return 'text'
    const first = vals[0]
    if (first instanceof StringValue) return 'text'
    if (first instanceof ImgFileValue) return 'image'
    if (first instanceof AudioFileValue) return 'audio'
    if (first instanceof VideoFileValue) return 'media'
    if (first instanceof FileValue) return 'file'
    return 'text'
  }

  /** 获取 ImgFileValue 对应的 DOM File */
  private getCurrentImageFile(): File | null {
    const vals = this.textPort.value
    if (vals.length === 0) return null
    const first = vals[0]
    if (first instanceof ImgFileValue && first.file) return first.file
    return null
  }

  /** 获取任意 FileValue 子类对应的 DOM File（audio/media/file 通用） */
  private getCurrentGenericFile(): File | null {
    const vals = this.textPort.value
    if (vals.length === 0) return null
    const first = vals[0]
    if (first instanceof FileValue && first.file) return first.file
    return null
  }

  // —— 配置修改 ——

  setBotId(v: string): void {
    const trimmed = v.trim()
    if (this.botId === trimmed) return
    this.botId = trimmed
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

  /** 是否具备发送的所有前置条件——按消息类型分别校验 */
  private canSend(): string | null {
    if (!this.botId) return '请先选择飞书机器人'
    const creds = this.resolveCredentials()
    if (!creds) return '机器人凭证未找到，请检查设置里的飞书机器人列表'
    if (!this.getEffectiveReceiveId()) return '请先填写接收方 ID'

    const msgType = this.getCurrentMsgType()
    if (msgType === 'text') {
      if (!this.getCurrentText()) return '消息内容为空'
    } else if (msgType === 'image') {
      const file = this.getCurrentImageFile()
      if (!file) return '图片文件为空'
    } else {
      // file / audio / media 都需要有 FileValue.file
      const file = this.getCurrentGenericFile()
      if (!file) return '文件为空'
    }
    return null
  }

  /**
   * 手动/自动触发发送。
   * 防抖：正在发送中直接跳过，防止连点导致多次发送。
   *
   * text   → send（纯文本）
   * image  → uploadImage → send（两步走）
   * file/audio/media → sendFile（主进程一站式：ffmpeg → 上传 → 发送）
   */
  async triggerSend(): Promise<void> {
    if (this.sendingNow) return

    const err = this.canSend()
    if (err) {
      this.setSendState('error', err)
      this.sentPort.commit(new BoolValue(false), { force: true })
      this.messageIdPort.commit(new StringValue(''), { force: true })
      this.notifyChanged()
      return
    }

    this.sendingNow = true
    this.setSendState('sending', '')

    const creds = this.resolveCredentials()!
    const msgType = this.getCurrentMsgType()

    try {
      let sendResult: { ok: true; messageId?: string } | { ok: false; error: string }

      if (msgType === 'image') {
        // 图片路径：先上传 → 再发送
        const file = this.getCurrentImageFile()!
        const buf = await file.arrayBuffer()

        // @ts-ignore
        const uploadRes = await window.feishuApi.uploadImage({
          appId: creds.appId,
          appSecret: creds.appSecret,
          fileName: file.name || 'image.png',
          buffer: buf
        })

        if (!uploadRes.ok) {
          sendResult = { ok: false, error: '图片上传失败：' + uploadRes.error }
        } else {
          // @ts-ignore
          sendResult = await window.feishuApi.send({
            appId: creds.appId,
            appSecret: creds.appSecret,
            receiveId: this.getEffectiveReceiveId(),
            receiveIdType: this.getEffectiveReceiveIdType(),
            msgType: 'image',
            imageKey: uploadRes.imageKey
          })
        }
      } else if (msgType === 'audio' || msgType === 'media') {
        // —— 音频/视频发送前先查 ffmpeg ——
        // @ts-ignore
        const ffmpeg = await window.feishuApi.getFfmpegStatus()
        const encoderOk = msgType === 'audio' ? ffmpeg.hasAudio : ffmpeg.hasVideo

        if (!encoderOk) {
          // 先弹确认框让用户决定是否安装
          const encoderName = msgType === 'audio' ? 'libopus' : 'libx264'
          const wantInstall = confirm(
            `发送${msgType === 'audio' ? '音频' : '视频'}消息需要 ffmpeg（带 ${encoderName} 编码器）。\n` +
            `本机检测不到可用的 ffmpeg。\n\n` +
            `是否现在通过内置命令行执行安装？\n` +
            `命令：brew install ffmpeg`
          )

          if (!wantInstall) {
            this.setSendState('error', '已取消：请先安装 ffmpeg 后再发送')
            this.sentPort.commit(new BoolValue(false), { force: true })
            this.messageIdPort.commit(new StringValue(''), { force: true })
            return
          }

          // 用户确认安装 → 调 commandApi.run 执行 brew install ffmpeg
          try {
            console.log('runApi---1')
            // @ts-ignore
            const runApi = window.runCommand
            console.log('runApi---2')
            if (runApi) {
              console.log('runApi---3')
              this.setSendState('sending', '正在安装 ffmpeg…')
              // console.Console
              // window.runCommand('ls -la ~')
              console.log('runApi---4', runApi)
              // @ts-ignore
              await runApi('brew install ffmpeg', { title: '安装 ffmpeg' })
            } else {
              // @ts-ignore
              window.open?.('https://ffmpeg.org/download.html')
              this.setSendState('error', '无法调用内置命令行，请手动安装 ffmpeg')
              return
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            this.setSendState('error', '安装失败：' + msg)
            this.sentPort.commit(new BoolValue(false), { force: true })
            this.messageIdPort.commit(new StringValue(''), { force: true })
            return
          }

          // 安装完再查一次
          // @ts-ignore
          const ffmpeg2 = await window.feishuApi.getFfmpegStatus()
          const encoderOk2 = msgType === 'audio' ? ffmpeg2.hasAudio : ffmpeg2.hasVideo
          if (!encoderOk2) {
            this.setSendState('error', 'ffmpeg 安装似乎未成功，请手动检查')
            this.sentPort.commit(new BoolValue(false), { force: true })
            this.messageIdPort.commit(new StringValue(''), { force: true })
            return
          }
        }

        // 文件类路径：主进程一站式（ffmpeg 自动转码 + 上传 + 发送）
        const file = this.getCurrentGenericFile()!
        const buf = await file.arrayBuffer()

        // @ts-ignore
        sendResult = await window.feishuApi.sendFile({
          appId: creds.appId,
          appSecret: creds.appSecret,
          receiveId: this.getEffectiveReceiveId(),
          receiveIdType: this.getEffectiveReceiveIdType(),
          kind: msgType,
          fileName: file.name || 'file.bin',
          buffer: buf
        })
      } else if (msgType === 'file') {
        // 普通文件路径：主进程一站式（直接上传 + 发送，无需 ffmpeg）
        const file = this.getCurrentGenericFile()!
        const buf = await file.arrayBuffer()

        // @ts-ignore
        sendResult = await window.feishuApi.sendFile({
          appId: creds.appId,
          appSecret: creds.appSecret,
          receiveId: this.getEffectiveReceiveId(),
          receiveIdType: this.getEffectiveReceiveIdType(),
          kind: msgType,
          fileName: file.name || 'file.bin',
          buffer: buf
        })
      } else {
        // 文本路径：直接发送
        // @ts-ignore
        sendResult = await window.feishuApi.send({
          appId: creds.appId,
          appSecret: creds.appSecret,
          receiveId: this.getEffectiveReceiveId(),
          receiveIdType: this.getEffectiveReceiveIdType(),
          msgType: 'text',
          text: this.getCurrentText()
        })
      }

      if (sendResult.ok) {
        this.setSendState('success', '')
        this.sentPort.commit(new BoolValue(true), { force: true })
        this.messageIdPort.commit(new StringValue(sendResult.messageId ?? ''), { force: true })
      } else {
        this.setSendState('error', sendResult.error)
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
      botId: this.botId,
      receiveId: this.receiveId,
      receiveIdType: this.receiveIdType,
      autoSend: this.autoSend
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    // 新版：直接 botId
    if (typeof state.botId === 'string') {
      this.botId = state.botId
    } else if (typeof state.appId === 'string' && typeof state.appSecret === 'string') {
      // 旧版迁移：节点里存的 appId/appSecret → 新版改由全局 SettingsDialog 管理
      this.botId = ''
    }
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
