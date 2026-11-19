import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { FileValue } from '../../engine/data/FileValue'
import { HtmlFileValue } from '../../engine/data/HtmlFileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { Node } from '../../engine/node/Node'
import type { Value } from '../../engine/data/Value'
import { clearQueueLabel } from './i18n'

const NODE_HEIGHT = 220

/** 审核超时再次提醒的间隔（毫秒）：5 分钟 */
const REMINDER_DELAY = 5 * 60 * 1000

/** 审核模式：queue（FIFO 队列逐条审核）/ override（只保留最新值覆盖） */
export type ReviewMode = 'queue' | 'override'

/** 卡片内 renderer 的 context：跟各 valueRenderer 组件的 context prop 保持一致 */
export type RenderContext = 'tooltip' | 'inline' | 'detail'

/**
 * 人工审核节点：接受所有现有 Value 子类，进入审核等待人工确认。
 *
 * 两种模式：
 * - queue：FIFO 队列，上游多次传入 → 一条条排队审核
 * - override：覆盖模式，上游多次传入 → 只保留最新的那一条待审核
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
    accepts: [NumberValue, StringValue, FileValue, HtmlFileValue, JsonValue],
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
  /** 拒绝理由输出端口（固定 StringValue 类型） */
  rejectReasonOutput: OutputPort | undefined

  /** FIFO 待审核队列（不含当前正在审核的项；仅 queue 模式使用） */
  private readonly queue: Value[] = []

  /** 当前正在审核的项，undefined 表示队列为空 */
  private current: Value | undefined

  /** 审核模式：默认 queue（兼容旧数据） */
  private mode: ReviewMode = 'queue'

  /** 收到音频类型待审核项时是否自动播放音频：默认 false（兼容旧数据） */
  private autoPlayAudio = false

  /** 最后一张飞书审核卡片的状态（发完后存，approve/reject 后用来更新卡片为已处理状态） */
  private _feishuCardState: { messageId: string; appId: string; appSecret: string; originalTitle: string } | undefined

  /** 卡片内 renderer 的 context：默认 tooltip（兼容旧数据） */
  private renderContext: RenderContext = 'tooltip'

  /** 卡片内各 kind renderer 的视图状态（按 VALUE_NAME 存，结构由各 renderer 自行决定） */
  private rendererSaveStates: Record<string, Record<string, unknown>> = {}

  /** 5 分钟超时再提醒的定时器；undefined 表示没有待触发的提醒 */
  private reminderTimer: ReturnType<typeof setTimeout> | undefined

  // —— 飞书推送配置 ——

  /** 是否启用飞书推送 */
  private feishuEnabled = false

  /** 全局飞书联系人 id（引用 SettingsDialog 里的飞书联系人列表） */
  private feishuPersonId = ''

  /** 全局机器人 id（联系人不再绑 botId，节点自己选发送管道） */
  private feishuBotId = ''

  constructor(id: string) {
    super(id)
    this.addInput(this.input)
    // 清空队列方法端口
    const clearQueuePort = new MethodPort('clear-queue', { label: clearQueueLabel })
    this.addMethod(clearQueuePort)
    clearQueuePort.onTrigger(() => this.clearQueue())
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

  /** 队列中还有多少项（不含当前）；override 模式永远返回 0 */
  get pendingCount(): number {
    if (this.mode === 'override') return 0
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

  /** 当前审核模式 */
  get reviewMode(): ReviewMode {
    return this.mode
  }

  /**
   * 切换审核模式。
   * - queue → override：清掉队列（保留当前正在审核的项，因为它是唯一需要被审核的）
   * - override → queue：空操作（切换后后续传入值自动入队）
   * 切换后发 notifyChanged，让 UI 立即刷新。
   */
  setReviewMode(mode: ReviewMode): void {
    if (mode === this.mode) return
    this.mode = mode
    if (mode === 'override') {
      // 切到覆盖模式 → 清掉积压的队列，只保留 current
      this.queue.length = 0
    }
    this.notifyChanged()
  }

  /** 收到音频类型待审核项时是否自动播放音频 */
  get autoPlayAudioEnabled(): boolean {
    return this.autoPlayAudio
  }

  /** 切换音频自动播放开关 */
  setAutoPlayAudio(enabled: boolean): void {
    if (enabled === this.autoPlayAudio) return
    this.autoPlayAudio = enabled
    this.notifyChanged()
  }

  /** 卡片内 renderer 的 context */
  get cardRenderContext(): RenderContext {
    return this.renderContext
  }

  /** 切换卡片内 renderer 的 context */
  setCardRenderContext(ctx: RenderContext): void {
    if (ctx === this.renderContext) return
    this.renderContext = ctx
    this.notifyChanged()
  }

  // —— 飞书推送配置 getter/setter ——

  getFeishuEnabled(): boolean { return this.feishuEnabled }
  setFeishuEnabled(v: boolean): void { this.feishuEnabled = v; this.notifyChanged() }

  getFeishuPersonId(): string { return this.feishuPersonId }
  setFeishuPersonId(v: string): void { this.feishuPersonId = v.trim(); this.notifyChanged() }

  getFeishuBotId(): string { return this.feishuBotId }
  setFeishuBotId(v: string): void { this.feishuBotId = v.trim(); this.notifyChanged() }

  /** 取某 kind 的 renderer 视图状态（kind 不在表里返回空对象） */
  getRendererSaveState(kind: string): Record<string, unknown> {
    return this.rendererSaveStates[kind] ?? {}
  }

  /** 存某 kind 的 renderer 视图状态；state 为空对象则清掉该 kind 的条目 */
  setRendererSaveState(kind: string, state: Record<string, unknown>): void {
    if (Object.keys(state).length === 0) {
      if (!(kind in this.rendererSaveStates)) return
      delete this.rendererSaveStates[kind]
    } else {
      const prev = this.rendererSaveStates[kind]
      // 深比较避免无意义 notifyChanged
      if (prev && JSON.stringify(prev) === JSON.stringify(state)) return
      this.rendererSaveStates[kind] = state
    }
    this.notifyChanged()
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
      // 上游完全断开 → 清队列 + 删输出端口 + 清提醒
      this.clearReminder()
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

    // —— 入队 / 覆盖 ——
    const value = values[0]

    if (this.mode === 'override') {
      // 覆盖模式：每次都替换 current，不维护队列；重置超时提醒计时
      this.clearReminder()
      this.current = value
      this.scheduleReminder()
      this.notifyChanged()

      // 覆盖模式：发飞书推送（不发系统通知——频繁覆盖场景下弹通知会骚扰用户，但飞书推送用户主动配置了就要发）
      if (this.feishuEnabled && this.feishuPersonId) {
        const label = value.displayLabel || '待审核项'
        void this.sendFeishuAsync(value, `人工审核待处理（覆盖更新）：${label}`).catch(() => { /* noop */ })
      }
      // 覆盖模式不发系统通知——频繁覆盖场景下弹通知会骚扰用户
      // 保持 dirty：有 current 待审核
      return
    }

    // queue 模式：FIFO 入队
    const wasEmpty = this.current === undefined
    if (wasEmpty) {
      this.current = value
    } else {
      this.queue.push(value)
    }
    this.notifyChanged()

    // 首次入队（队列为空 → 有了第一项）时发系统通知 + 启动超时提醒，避免队列积压连弹 N 条
    if (wasEmpty) {
      const label = value.displayLabel || '待审核项'
      // bracket 访问绕过 node tsconfig 的 Window 类型差异（web tsconfig 正常）
      const w = window as unknown as {
        notificationApi?: { show: (t: string, b?: string, m?: Record<string, unknown>) => Promise<unknown> }
        getCurrentCanvasId?: () => string
      }
      if (w.notificationApi) {
        const canvasId = w.getCurrentCanvasId?.()
        // fire-and-forget：通知发丢了不影响节点逻辑
        w.notificationApi.show('人工审核待处理', label, {
          ...(canvasId ? { canvasId } : {}),
          nodeId: this.id
        }).catch(() => { /* noop */ })
      }
      // 首次有待审核项 → 飞书推送（只发首次，避免队列积压连刷 N 条飞书）
      if (this.feishuEnabled && this.feishuPersonId) {
        void this.sendFeishuAsync(value, `人工审核待处理：${label}`).catch(() => { /* noop */ })
      }
      // 首次有待审核项 → 启动 5 分钟超时再提醒
      this.scheduleReminder()
    }

    // 入队后保持 dirty——队列非空 = 有未处理的审核项，等 approve/reject 清空后 stable
  }

  /** 从 allBindEdge 推算上游 OutputPort 的类型（不要求值已到达） */
  private resolveUpstreamValueClass(): OutputPort['valueClass'] | undefined {
    for (const edge of this.input.allBindEdge) {
      return edge.startPort.valueClass
    }
    return undefined
  }

  /** 首次有值时创建三个输出端口 */
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
    this.rejectReasonOutput = new OutputPort('reject-reason', StringValue, {
      zh: '拒绝理由',
      en: 'Reject Reason',
      ja: '却下理由',
      ko: '거부 사유',
      es: 'Motivo de rechazo',
      ar: 'سبب الرفض',
      fr: 'Raison du rejet',
      pt: 'Motivo da rejeição',
      ru: 'Причина отклонения',
      hi: 'अस्वीकार का कारण',
      id: 'Alasan penolakan',
      de: 'Ablehnungsgrund',
      vi: 'Lý do từ chối',
      tr: 'Reddetme nedeni',
      it: 'Motivo del rifiuto'
    })
    this.addOutput(this.approveOutput)
    this.addOutput(this.rejectOutput)
    this.addOutput(this.rejectReasonOutput)
  }

  /** 类型变化时删掉旧端口（自动断下游边）+ 新建 */
  private rebuildOutputPorts(valueClass: OutputPort['valueClass']): void {
    if (!this.approveOutput || !this.rejectOutput) return
    this.removeOutput(this.approveOutput)
    this.removeOutput(this.rejectOutput)
    if (this.rejectReasonOutput) {
      this.removeOutput(this.rejectReasonOutput)
      this.rejectReasonOutput = undefined
    }
    this.createOutputPorts(valueClass)
  }

  /** 上游清空时删掉三个输出端口 */
  private deleteOutputPorts(): void {
    if (this.approveOutput) {
      this.removeOutput(this.approveOutput)
      this.approveOutput = undefined
    }
    if (this.rejectOutput) {
      this.removeOutput(this.rejectOutput)
      this.rejectOutput = undefined
    }
    if (this.rejectReasonOutput) {
      this.removeOutput(this.rejectReasonOutput)
      this.rejectReasonOutput = undefined
    }
  }

  // —— 超时再提醒 ——

  /** 安排 5 分钟后再次发提醒；已有定时器则先清掉再重排 */
  private scheduleReminder(): void {
    this.clearReminder()
    this.reminderTimer = setTimeout(() => {
      // 触发时 current 可能已被审完（用户恰好 5 分钟整点操作），双重检查
      if (this.current === undefined) return
      const label = this.current.displayLabel || '待审核项'
      const w = window as unknown as {
        notificationApi?: { show: (t: string, b?: string, m?: Record<string, unknown>) => Promise<unknown> }
        getCurrentCanvasId?: () => string
      }
      if (w.notificationApi) {
        const canvasId = w.getCurrentCanvasId?.()
        w.notificationApi.show('人工审核待处理（已超时）', label, {
          ...(canvasId ? { canvasId } : {}),
          nodeId: this.id
        }).catch(() => { /* noop */ })
      }
      // 5 分钟超时 → 飞书推送
      if (this.feishuEnabled && this.feishuPersonId) {
        void this.sendFeishuAsync(this.current!, `人工审核已超时 5 分钟：${label}`).catch(() => { /* noop */ })
      }
      // 只提醒一次，发完清掉
      this.reminderTimer = undefined
    }, REMINDER_DELAY)
  }

  /** 清除待触发的提醒定时器 */
  private clearReminder(): void {
    if (this.reminderTimer !== undefined) {
      clearTimeout(this.reminderTimer)
      this.reminderTimer = undefined
    }
  }

  /**
   * 飞书异步推送（HumanReviewNode 三个触发点复用）。
   *
   * 一律发审核卡片（interactive）——包含 value 展示区 + 同意/拒绝按钮。
   * 按钮 value 带 { action, nodeId }，回调里据此路由回对应节点。
   *
   * ImgFileValue：先 uploadImage 拿 image_key → 卡片 markdown 里用 <img image_key="xxx"> 嵌入
   * 其他类型：displayLabel 直接进卡片 markdown
   *
   * 发送失败弹桌面通知（飞书错误码 + msg），方便用户定位配置问题。
   */
  private async sendFeishuAsync(value: Value, textLabel: string): Promise<void> {
    if (!this.feishuEnabled || !this.feishuPersonId) return

    const w = window as unknown as {
      notificationApi?: { show: (t: string, b?: string, m?: Record<string, unknown>) => Promise<unknown> }
    }

    if (!this.feishuBotId) {
      w.notificationApi?.show('飞书推送失败', '请先在人工审核节点配置里选择飞书机器人')
      return
    }

    // @ts-ignore
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

    try {
      // —— 确保 WS 长连接已建立（收 card.action.trigger 按钮回调需要）——
      // startFeishu 主进程是单例：同一凭证已连则跳过，不同凭证则关旧起新
      // @ts-ignore
      await window.feishuApi.start({ appId: creds.appId, appSecret: creds.appSecret }).catch(() => {
        // WS 连接失败不阻塞发卡——REST 发消息不依赖 WS，只是收不到按钮回调
      })

      // —— 先处理图片：upload 拿 image_key，卡片里用独立 img element 展示 ——
      let imageKey: string | undefined
      let markdownBody = textLabel
      if (value instanceof ImgFileValue && !value.isNull && value.file) {
        const buffer = await value.file.arrayBuffer()
        // @ts-ignore
        const uploadRes = await window.feishuApi?.uploadImage({
          appId: creds.appId,
          appSecret: creds.appSecret,
          fileName: value.file.name || 'image.png',
          buffer
        })
        if (!uploadRes?.ok) {
          w.notificationApi?.show('飞书推送失败', uploadRes?.error || '图片上传失败')
          return
        }
        imageKey = uploadRes.imageKey
        markdownBody = `${textLabel}\n\n**文件**: \`${value.file.name}\``
      } else if (value instanceof StringValue && !value.isNull) {
        // 字符串值：内容本身放 markdown（截断到 1000 字符，避免卡片过长）
        const raw = (value as unknown as { value?: string }).value ?? ''
        const snippet = raw.length > 1000 ? raw.slice(0, 1000) + '…(已截断)' : raw
        markdownBody = `${textLabel}\n\n\`\`\`\n${snippet}\n\`\`\``
      } else if (value instanceof JsonValue && !value.isNull) {
        // JSON 值：格式化后放 markdown 代码块
        const raw = (value as unknown as { value?: unknown }).value
        const pretty = JSON.stringify(raw, null, 2)
        const snippet = pretty.length > 1500 ? pretty.slice(0, 1500) + '\n…(已截断)' : pretty
        markdownBody = `${textLabel}\n\n\`\`\`json\n${snippet}\n\`\`\``
      } else if (!value.isNull && typeof value.displayLabel === 'string') {
        markdownBody = `${textLabel}\n\n**内容**: \`${value.displayLabel}\``
      }

      // —— HtmlFileValue：卡片里只显示文件名，紧接着单独发一条 file 附件消息 ——
      let htmlFileToSend: { fileName: string; buffer: ArrayBuffer } | undefined
      if (value instanceof HtmlFileValue && !value.isNull && value.file) {
        htmlFileToSend = {
          fileName: value.file.name || 'index.html',
          buffer: await value.file.arrayBuffer()
        }
        markdownBody = `${textLabel}\n\n**HTML 文件**: \`${value.file.name}\`\n\n_点击下方文件附件查看完整内容_`
      }

      // —— 拼飞书卡片 JSON（Card JSON 2.0）——
      const card = {
        schema: '2.0',
        config: { wide_screen_mode: true, enable_forward: false },
        header: {
          title: { tag: 'plain_text', content: textLabel.length > 30 ? textLabel.slice(0, 30) + '…' : textLabel },
          template: 'orange'
        },
        body: {
          elements: [
            { tag: 'markdown', content: markdownBody },
            // 图片值：独立 img element（Card JSON 2.0 必须用 img tag，markdown 不支持 <img>）
            ...(imageKey
              ? [{ tag: 'img', img_key: imageKey, alt: { tag: 'plain_text', content: '' } }]
              : []),
            { tag: 'hr' },
            // 同意按钮：直接 callback，不需要理由
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '✅ 同意' },
              type: 'primary',
              behaviors: [{
                type: 'callback',
                value: { action: 'approve', nodeId: this.id, mode: this.mode }
              }]
            },
            // 拒绝：表单容器 + input（拒绝理由）+ submit 按钮（behaviors callback 里带 reject action）
            {
              tag: 'form',
              name: 'reject_form',
              direction: 'vertical',
              elements: [
                {
                  tag: 'input',
                  name: 'reject_reason',
                  placeholder: { tag: 'plain_text', content: '请输入拒绝理由（可选）' },
                  input_type: 'multiline_text',
                  rows: 2
                },
                {
                  tag: 'button',
                  name: 'btn_reject_submit',
                  text: { tag: 'plain_text', content: '❌ 确认拒绝' },
                  type: 'danger',
                  form_action_type: 'submit',
                  behaviors: [{
                    type: 'callback',
                    value: { action: 'reject', nodeId: this.id, mode: this.mode }
                  }]
                }
              ]
            }
          ]
        }
      }

      // @ts-ignore
      const sendRes = await window.feishuApi?.send({
        appId: creds.appId,
        appSecret: creds.appSecret,
        receiveId: person.receiveId,
        receiveIdType: person.receiveIdType,
        msgType: 'interactive',
        cardJson: JSON.stringify(card)
      })
      if (sendRes && !sendRes.ok) {
        w.notificationApi?.show('飞书推送失败', sendRes.error || '未知错误')
        return
      }

      // —— 存卡片状态（approve/reject 后用来更新卡片为已处理状态）——
      if (sendRes?.messageId) {
        this._feishuCardState = {
          messageId: sendRes.messageId,
          appId: creds.appId,
          appSecret: creds.appSecret,
          originalTitle: textLabel
        }
      }

      // —— HtmlFileValue：发完卡片后，紧接着发一条文件附件消息 ——
      if (htmlFileToSend) {
        try {
          // @ts-ignore
          const fileRes = await window.feishuApi?.sendFile({
            appId: creds.appId,
            appSecret: creds.appSecret,
            receiveId: person.receiveId,
            receiveIdType: person.receiveIdType,
            kind: 'file',
            fileName: htmlFileToSend.fileName,
            buffer: htmlFileToSend.buffer
          })
          if (fileRes && !fileRes.ok) {
            w.notificationApi?.show('飞书 HTML 文件发送失败', fileRes.error || '未知错误')
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          w.notificationApi?.show('飞书 HTML 文件发送失败', msg)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      w.notificationApi?.show('飞书推送失败', msg)
    }
  }

  // —— 人工操作 ——

  /** 同意当前项：commit 到 approveOutput，然后取下一个 */
  approve(): void {
    if (!this.current || !this.approveOutput) return
    this.approveOutput.commit(this.current, { force: true })
    // 更新飞书卡片为已处理状态
    this._updateFeishuCard('approved')
    this.advance()
  }

  /** 拒绝当前项：commit 到 rejectOutput + rejectReasonOutput（拒绝理由字符串），然后取下一个 */
  reject(reason: string): void {
    if (!this.current || !this.rejectOutput) return
    this.rejectOutput.commit(this.current, { force: true })
    if (this.rejectReasonOutput) {
      this.rejectReasonOutput.commit(new StringValue(reason ?? ''), { force: true })
    }
    // 更新飞书卡片为已处理状态（带理由）
    this._updateFeishuCard('rejected', reason)
    this.advance()
  }

  /**
   * 把飞书审核卡片更新成已处理状态（无按钮、显示处理结果）。
   * 仅当发卡片时存了 messageId + creds 才执行；不执行也不影响正常流程。
   */
  private _updateFeishuCard(result: 'approved' | 'rejected', reason?: string): void {
    const state = this._feishuCardState
    if (!state) return
    // 异步更新，不阻塞 Canvas 主流程
    void (async () => {
      const processedCard = {
        schema: '2.0',
        header: {
          title: { tag: 'plain_text', content: '✅ 人工审核已完成' },
          template: result === 'approved' ? 'green' : 'red'
        },
        body: {
          elements: [
            {
              tag: 'markdown',
              content: result === 'approved'
                ? `**结果**: ✅ 已同意\n\n${state.originalTitle}`
                : `**结果**: ❌ 已拒绝\n\n${state.originalTitle}${reason ? `\n\n**拒绝理由**: ${reason}` : ''}`
            }
          ]
        }
      }
      try {
        // @ts-ignore
        const res = await window.feishuApi?.update({
          appId: state.appId,
          appSecret: state.appSecret,
          messageId: state.messageId,
          msgType: 'interactive',
          content: JSON.stringify(processedCard)
        })
        if (res && !res.ok) {
          console.warn('[HumanReviewNode] 更新飞书卡片失败:', res.error)
        }
      } catch (err) {
        console.warn('[HumanReviewNode] 更新飞书卡片异常:', err)
      }
    })()
    // 更新完清掉状态，避免 approve/reject 被重复调用时又更新一次
    this._feishuCardState = undefined
  }

  /** 审核通过/拒绝后取下一个待审核项 */
  private advance(): void {
    if (this.mode === 'override') {
      // 覆盖模式：只有一条，审完就清空 → 清提醒
      this.current = undefined
      this.clearReminder()
    } else {
      // queue 模式：从队列取下一个成为当前项；队列为空则 current 置 undefined
      this.current = this.queue.shift()
      // 还有下一项 → 重新开始 5 分钟计时；没有了 → 清提醒
      if (this.current !== undefined) {
        this.scheduleReminder()
      } else {
        this.clearReminder()
      }
    }
    this.notifyChanged()
    // 没有待审核项了 → stable
    if (this.current === undefined) {
      this.completeRun()
    }
  }

  /** 清空当前审核项 + 积压队列，回到等待输入状态 */
  clearQueue(): void {
    if (this.current === undefined && this.queue.length === 0) return
    this.clearReminder()
    this.current = undefined
    this.queue.length = 0
    this.notifyChanged()
    this.completeRun()
  }

  // —— 持久化 ——

  /**
   * 持久化 box 尺寸和审核模式。
   * 队列不持久化，恢复时上游重新 commit 自动重建；输出端口动态重建。
   */
  getSaveDataByState(): Record<string, unknown> {
    return {
      ...super.getSaveDataByState(),
      box: [...this.box],
      mode: this.mode,
      autoPlayAudio: this.autoPlayAudio,
      renderContext: this.renderContext,
      rendererSaveStates: this.rendererSaveStates,
      feishuEnabled: this.feishuEnabled,
      feishuPersonId: this.feishuPersonId,
      feishuBotId: this.feishuBotId
    }
  }

  initStateBySaveData(state: Record<string, unknown>): void {
    super.initStateBySaveData(state)

    // 恢复用户保存的 box 尺寸；老版本数据没有 box 字段，跳过即可（构造函数已设了默认值）
    const box = state.box as unknown
    if (Array.isArray(box) && box.length === 2 && typeof box[0] === 'number' && typeof box[1] === 'number') {
      this.setBox(box[0], box[1])
    }
    // 恢复审核模式；老版本没有 mode 字段，默认 queue（向后兼容）
    const mode = state.mode as unknown
    if (mode === 'queue' || mode === 'override') {
      this.mode = mode
    }
    // 恢复音频自动播放开关；老版本没有 autoPlayAudio 字段，默认 false（向后兼容）
    const autoPlayAudio = state.autoPlayAudio as unknown
    if (typeof autoPlayAudio === 'boolean') {
      this.autoPlayAudio = autoPlayAudio
    }
    // 恢复卡片内 renderer context；老版本没有 renderContext 字段，默认 tooltip（向后兼容）
    const renderContext = state.renderContext as unknown
    if (renderContext === 'tooltip' || renderContext === 'inline' || renderContext === 'detail') {
      this.renderContext = renderContext
    }
    // 恢复各 kind renderer 的视图状态；动态结构，只做"是纯对象"校验
    const rendererSaveStates = state.rendererSaveStates as unknown
    if (rendererSaveStates && typeof rendererSaveStates === 'object' && !Array.isArray(rendererSaveStates)) {
      const obj = rendererSaveStates as Record<string, unknown>
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          this.rendererSaveStates[k] = v as Record<string, unknown>
        }
      }
    }
    // 恢复飞书推送配置
    if (typeof state.feishuEnabled === 'boolean') this.feishuEnabled = state.feishuEnabled
    if (typeof state.feishuPersonId === 'string') this.feishuPersonId = state.feishuPersonId.trim()
    if (typeof state.feishuBotId === 'string') this.feishuBotId = state.feishuBotId.trim()
    // 队列和输出端口都由上游重新 commit 时自动重建
  }
}
