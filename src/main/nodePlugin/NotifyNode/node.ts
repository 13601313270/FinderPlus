import { BoolValue } from '../../engine/data/BoolValue'
import { FileValue } from '../../engine/data/FileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { TxtFileValue } from '../../engine/data/TxtFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { Node } from '../../engine/node/Node'
import { inLabel } from './i18n'
import { VideoFileValue } from '../../engine/data/VideoFileValue'
import { AudioFileCollectionValue } from '../../engine/data/AudioFileCollectionValue'
import { ImgFileCollectionValue } from '../../engine/data/ImgFileCollectionValue'

/**
 * 通知节点（Notify）：终端节点，收到任意值时发起系统级通知；
 * 可选扩展飞书推送通道——以联系人绑定的飞书机器人身份向该联系人发文本消息。
 *
 * 行为：
 * - 单输入端口，接受所有内置 Value 子类
 * - 值到达时，优先使用用户在 detailPanel 中配置的通知文字；未配置则取 value.displayLabel
 * - 无输出端口——通知是终端语义，不向下游传播
 * - 同步节点：发完通知 + 飞书推送后立即 completeRun()
 *
 * 飞书推送配置：只存 feishuPersonId（引用全局飞书联系人列表）。
 * 机器人身份、接收方 ID、ID 类型全由联系人条目决定——联系人绑定的机器人必是唯一正确选择
 * （open_id / union_id / user_id 是应用隔离的，换别的机器人发会 cross app）。
 */
export class NotifyNode extends Node {
  static readonly TYPE = 'notify'
  readonly type = NotifyNode.TYPE

  /** 所有内置 Value 子类 */
  private static readonly ALL_VALUE_CLASSES = [
    StringValue, NumberValue, BoolValue, JsonValue, FileValue, ImgFileValue, TxtFileValue, VideoFileValue, AudioFileCollectionValue, ImgFileCollectionValue
  ]

  /** 输入端口 */
  private readonly inputPort: InputPort

  /** 用户配置的通知文字模板；为空时 fallback 到 value.displayLabel */
  private textTemplate = ''

  // —— 飞书推送配置 ——

  /** 是否启用飞书推送 */
  private feishuEnabled = false

  /** 全局飞书联系人 id（引用 SettingsDialog 里的飞书联系人列表） */
  private feishuPersonId = ''

  /** 全局机器人 id（联系人不再绑 botId，节点自己选发送管道） */
  private feishuBotId = ''

  constructor(id: string) {
    super(id)
    this.inputPort = new InputPort('in', {
      accepts: NotifyNode.ALL_VALUE_CLASSES,
      label: inLabel,
      isHiddenLabel: true
    })
    this.addInput(this.inputPort)
    // header(~24px) + 内容区(~32px)
    this.setBox(120, 56)
  }

  /** detailPanel 读取当前模板 */
  getTextTemplate(): string {
    return this.textTemplate
  }

  /** detailPanel 写入模板 */
  setTextTemplate(template: string): void {
    this.textTemplate = template
    this.notifyChanged()
  }

  // —— 飞书推送配置 getter/setter ——

  getFeishuEnabled(): boolean { return this.feishuEnabled }
  setFeishuEnabled(v: boolean): void { this.feishuEnabled = v; this.notifyChanged() }

  getFeishuPersonId(): string { return this.feishuPersonId }
  setFeishuPersonId(v: string): void { this.feishuPersonId = v.trim(); this.notifyChanged() }

  getFeishuBotId(): string { return this.feishuBotId }
  setFeishuBotId(v: string): void { this.feishuBotId = v.trim(); this.notifyChanged() }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  // —— 输入：发通知 ——

  inputPortReceiveValue(_ports: InputPort[]): void {
    const [value] = this.inputPort.value
    if (value === undefined) {
      // 有连线但还没值 → 无事可做
      this.completeRun()
      return
    }

    let body: string
    if (this.textTemplate.trim().length > 0) {
      body = this.textTemplate
    } else {
      body = value.displayLabel || '收到一条消息'
    }

    // 系统通知：fire-and-forget
    const w = window as unknown as {
      notificationApi?: { show: (t: string, b?: string, m?: Record<string, unknown>) => Promise<unknown> }
      getCurrentCanvasId?: () => string
    }
    if (w.notificationApi) {
      const canvasId = w.getCurrentCanvasId?.()
      w.notificationApi.show('通知', body, {
        ...(canvasId ? { canvasId } : {}),
        nodeId: this.id
      }).catch(() => { /* noop */ })
    }

    // 飞书推送（可选）：启用 + 配置齐全才发，发失败弹桌面通知
    if (this.feishuEnabled) {
      void this.sendFeishuAsync(body).catch(() => { /* noop */ })
    }

    this.notifyChanged()
    this.completeRun()
  }

  /**
   * 飞书异步推送：resolvePerson 拿联系人（receiveId / receiveIdType）
   * → resolveBotCredentials 拿凭证 → feishuApi.send 发文本。
   *
   * 联系人不再绑定 botId，机器人身份由节点自己选（feishuBotId）。
   * 发送失败弹桌面通知（飞书错误码 + msg），方便用户定位配置问题。
   */
  private async sendFeishuAsync(text: string): Promise<void> {
    const w = window as unknown as {
      notificationApi?: { show: (t: string, b?: string, m?: Record<string, unknown>) => Promise<unknown> }
    }

    if (!this.feishuPersonId) return
    if (!this.feishuBotId) {
      w.notificationApi?.show('飞书推送失败', '请先在通知节点配置里选择飞书机器人')
      return
    }

    // @ts-ignore — resolvePerson 挂在 window.feishuApi 上
    const person = window.feishuApi?.resolvePerson(this.feishuPersonId)
    if (!person) {
      w.notificationApi?.show('飞书推送失败', '联系人已删除或配置无效')
      return
    }

    // @ts-ignore
    const creds = window.feishuApi?.resolveBotCredentials(this.feishuBotId)
    if (!creds) {
      w.notificationApi?.show('飞书推送失败', '机器人凭证已删除或无效')
      return
    }

    // @ts-ignore
    const result = await window.feishuApi?.send({
      appId: creds.appId,
      appSecret: creds.appSecret,
      receiveId: person.receiveId,
      receiveIdType: person.receiveIdType,
      msgType: 'text',
      text
    })

    if (result && !result.ok) {
      const errMsg = result.error || '未知错误'
      w.notificationApi?.show('飞书推送失败', errMsg)
    }
  }

  // —— 持久化 ——

  getSaveDataByState(): Record<string, unknown> {
    return {
      ...super.getSaveDataByState(),
      textTemplate: this.textTemplate,
      feishuEnabled: this.feishuEnabled,
      feishuPersonId: this.feishuPersonId,
      feishuBotId: this.feishuBotId
    }
  }

  initStateBySaveData(_state: Record<string, unknown>): void {
    super.initStateBySaveData(_state)

    const tpl = _state.textTemplate
    if (typeof tpl === 'string') {
      this.textTemplate = tpl
    }

    if (typeof _state.feishuEnabled === 'boolean') this.feishuEnabled = _state.feishuEnabled
    if (typeof _state.feishuPersonId === 'string') this.feishuPersonId = _state.feishuPersonId.trim()
    if (typeof _state.feishuBotId === 'string') this.feishuBotId = _state.feishuBotId.trim()
  }
}
