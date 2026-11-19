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
 * 可选扩展飞书推送通道——以指定飞书机器人身份向指定联系人发文本消息。
 *
 * 行为：
 * - 单输入端口，接受所有内置 Value 子类
 * - 值到达时，优先使用用户在 detailPanel 中配置的通知文字；未配置则取 value.displayLabel
 * - 无输出端口——通知是终端语义，不向下游传播
 * - 同步节点：发完通知 + 飞书推送后立即 completeRun()
 *
 * 飞书推送配置逻辑：
 * - feishuPersonId 引用全局飞书联系人列表（SettingsDialog 配置）
 * - feishuBotId 是可选 override：节点显式选了 → 用它；没选 → 用联系人绑定的默认机器人
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

  /** 全局机器人 id（可选 override；为空则用联系人绑定的默认机器人） */
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

    // 飞书推送（可选）：启用 + 配置齐全才发，发丢了不影响节点逻辑
    if (this.feishuEnabled) {
      void this.sendFeishuAsync(body).catch(() => { /* noop */ })
    }

    this.notifyChanged()
    this.completeRun()
  }

  /**
   * 飞书异步推送：resolvePerson 拿联系人 → 决定最终 botId → resolveBotCredentials → send。
   * 优先级：节点 feishuBotId > 联系人绑定的 botId；都没 → 跳过。
   *
   * 发送失败时弹桌面通知（飞书错误码 + msg），方便用户定位配置问题——
   * open_id cross app / 权限未开 / 机器人未入群 等错误都能直接看到。
   */
  private async sendFeishuAsync(text: string): Promise<void> {
    // 拿 notificationApi 引用，后面发错用
    const w = window as unknown as {
      notificationApi?: { show: (t: string, b?: string, m?: Record<string, unknown>) => Promise<unknown> }
      getCurrentCanvasId?: () => string
    }

    if (!this.feishuPersonId) return

    // @ts-ignore — resolvePerson 挂在 window.feishuApi 上
    const person = window.feishuApi?.resolvePerson(this.feishuPersonId)
    if (!person) {
      w.notificationApi?.show('飞书推送失败', '联系人已删除或配置无效')
      return
    }

    // 决定最终 botId：节点的 override 优先；没 override 就用联系人绑定的（必绑）
    const finalBotId = this.feishuBotId || person.botId
    if (!finalBotId) {
      w.notificationApi?.show('飞书推送失败', '未绑定机器人：请在设置页编辑该联系人')
      return
    }

    // @ts-ignore
    const creds = window.feishuApi?.resolveBotCredentials(finalBotId)
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
    if (typeof _state.feishuPersonId === 'string') this.feishuPersonId = _state.feishuPersonId
    if (typeof _state.feishuBotId === 'string') this.feishuBotId = _state.feishuBotId
  }
}
