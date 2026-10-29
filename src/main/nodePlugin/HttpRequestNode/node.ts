import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { FileValue } from '../../engine/data/FileValue'
import { StringValue } from '../../engine/data/StringValue'
import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** HTTP 方法（大写，constructor 里会 toUpperCase） */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'

/** 请求状态：UI 据此决定按钮可点 / 结果区样式 */
export type HttpRequestStatus = 'idle' | 'running' | 'done' | 'error'

/** 输出模式：text = 响应体文本；image = 图片文件；audio = 音频文件 */
export type HttpOutputMode = 'text' | 'image' | 'audio'

/** 单个 header 条目（持久化 & UI 共用） */
export type HeaderEntry = { key: string; value: string }

const ALL_METHODS: readonly HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']

/** 默认超时：毫秒 */
const DEFAULT_TIMEOUT = 15_000

/**
 * HTTP 请求节点：把一条常发的 HTTP / HTTPS 请求**保存**在节点里，点「发送」即可执行。
 *
 * URL / headers 里的 value / body 都是**模板**：用 $1 $2 $3 … 引用第 N 个字符串输入端口的值，
 * 拼出最终值（仿 CommandNode / StringConcatNode）。端口由用户手动增删，编号始终连续。
 *
 * headers 以 KV 列表形式在 UI 中编辑（每条一行：key + value），比 JSON 友好。
 * body 对 GET / HEAD 会被忽略（主进程也会跳过），其余方法原样发送。
 *
 * 真正的网络请求在主进程（Node http / https），渲染进程经 preload 的 httpApi 转发——
 * 不走 fetch 是为了绕开渲染进程的 CORS 限制，也让自签证书、内网服务都能访问。
 *
 * 输出端口把响应 body（string）发往下游。
 */
/** 默认输出端口 label（多语言），重建时复用 */
const OUTPUT_LABEL: import('../../../shared/language').LocalizedText = {
  zh: '响应体',
  en: 'Response Body',
  ja: '応答本文',
  ko: '응답 본문',
  es: 'Cuerpo de respuesta',
  ar: 'جسم الاستجابة',
  fr: 'Corps de la réponse',
  pt: 'Corpo da resposta',
  ru: 'Тело ответа',
  hi: 'प्रतिक्रिया body',
  id: 'Body respons',
  de: 'Antwort-body',
  vi: 'Body phản hồi',
  tr: 'Yanıt body’si',
  it: 'Corpo della risposta'
}

export class HttpRequestNode extends Node {
  static readonly TYPE = 'http-request'
  readonly type = HttpRequestNode.TYPE

  /** 输出端口：响应体，类型随 outputMode 切换（StringValue ↔ ImgFileValue） */
  private _textOutput: OutputPort

  get textOutput(): OutputPort { return this._textOutput }

  /** 方法端口：上游 commit 任意值即触发一次发送 */
  readonly sendPort = new MethodPort('send', {
    label: {
      zh: '发送',
      en: 'Send',
      ja: '送信',
      ko: '전송',
      es: 'Enviar',
      ar: 'إرسال',
      fr: 'Envoyer',
      pt: 'Enviar',
      ru: 'Отправить',
      hi: 'भेजें',
      id: 'Kirim',
      de: 'Senden',
      vi: 'Gửi',
      tr: 'Gönder',
      it: 'Invia'
    }
  })

  // —— 持久化字段 ——

  /** HTTP 方法 */
  private method: HttpMethod = 'GET'

  /** URL 模板（含 $N 占位符） */
  private urlTemplate = ''

  /** headers KV 列表（每条一个 key + value，UI 直接编辑） */
  private headers: HeaderEntry[] = []

  /** 请求体文本 */
  private bodyText = ''

  /** 超时毫秒 */
  private timeoutMs = DEFAULT_TIMEOUT

  /** 输出模式：text（默认，StringValue）/ image（ImgFileValue） */
  private outputMode: HttpOutputMode = 'text'

  /** 端口 id 自增序号，保证 id 唯一（与 $N 的编号无关） */
  private portSeq = 0

  /** 文件端口 id 自增序号（文件端口 id 是 f1 / f2 / f3 …） */
  private filePortSeq = 0

  /** 文件端口 → multipart fieldName 的映射（持久化） */
  private filePortFields = new Map<string, string>()

  // —— 派生状态（不持久化） ——

  /** 按模板 + 当前输入值生成的最终 URL（UI 展示、执行时都用它） */
  private resolvedUrl = ''

  /** headers KV 模板替换后的值 */
  private resolvedHeaders: HeaderEntry[] = []

  /** body 模板替换后的值 */
  private resolvedBodyText = ''

  private status: HttpRequestStatus = 'idle'
  private lastStatus = 0
  private lastStatusText = ''
  private lastBody = ''
  private lastError = ''

  /** 折叠状态（持久化）：true 时 render.vue 动态缩小 box 高度 */
  private collapsed = false

  /** 正常展开时 box 尺寸（构造默认值；实际高度由 render.vue 动态测量） */
  private static readonly EXPANDED_BOX: [number, number] = [260, 178]

  constructor(id: string) {
    super(id)
    this._textOutput = new OutputPort('text', StringValue, OUTPUT_LABEL)
    this.addOutput(this._textOutput)
    this.addMethod(this.sendPort)
    this.sendPort.onTrigger(() => { void this.run() })
    // 默认给一个文件端口（fieldName 默认 'file'）和一个文本模板端口
    this.addFilePort('file')
    this.addInputPort()
    // 内容区硬约束：手柄 + 方法/URL + headers/body + 端口控制 + 发送按钮 + 结果
    this.setBox(...HttpRequestNode.EXPANDED_BOX)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  // —— 渲染层读的状态 ——

  /** 可选方法列表（UI 下拉用） */
  get availableMethods(): readonly HttpMethod[] {
    return ALL_METHODS
  }

  /** 当前选中的方法 */
  get displayMethod(): HttpMethod {
    return this.method
  }

  /** URL 模板原文 */
  get displayUrlTemplate(): string {
    return this.urlTemplate
  }

  /** 生成的最终 URL（UI 展示、执行时都用它） */
  get displayResolvedUrl(): string {
    return this.resolvedUrl
  }

  /** headers KV 模板替换后的值（UI 显示用） */
  get displayResolvedHeaders(): readonly HeaderEntry[] {
    return this.resolvedHeaders
  }

  /** headers KV 列表（UI 直接绑定） */
  get displayHeaders(): HeaderEntry[] {
    return this.headers
  }

  /** 请求体文本 */
  get displayBody(): string {
    return this.bodyText
  }

  /** 超时毫秒 */
  get displayTimeout(): number {
    return this.timeoutMs
  }

  /** 当前输出模式：text 或 image */
  get displayOutputMode(): HttpOutputMode {
    return this.outputMode
  }

  /**
   * 切换输出模式——removeOutput 删旧端口 → new OutputPort 新类型 → addOutput 插回 index 0。
   * removeOutput 会自动断开下游 Edge，跟 PromiseAllNode 的 rebuildOutputPort 同构。
   */
  setOutputMode(mode: HttpOutputMode): void {
    if (mode === this.outputMode) return
    this.outputMode = mode
    this.rebuildOutputPortForMode()
    this.notifyChanged()
  }

  /** 根据当前 this.outputMode 重建 textOutput 的 Value 类型（readState 恢复时也需要调） */
  private rebuildOutputPortForMode(): void {
    const newClass = this.outputMode === 'text' ? StringValue
      : this.outputMode === 'image' ? ImgFileValue
      : AudioFileValue
    const newPort = new OutputPort('text', newClass, OUTPUT_LABEL)
    this.removeOutput(this._textOutput)
    this._textOutput = newPort
    this.addOutput(newPort, 0)
  }

  /** 当前模板输入端口数量（fileBodyPort 不计入） */
  get inputCount(): number {
    return this.templateInputPorts.length
  }

  get displayStatus(): HttpRequestStatus {
    return this.status
  }

  get displayLastStatus(): number {
    return this.lastStatus
  }

  get displayLastStatusText(): string {
    return this.lastStatusText
  }

  get displayLastBody(): string {
    return this.lastBody
  }

  get displayLastError(): string {
    return this.lastError
  }

  /** 当前方法是否支持 body（GET/HEAD 不带 body） */
  get methodAllowsBody(): boolean {
    return this.method !== 'GET' && this.method !== 'HEAD'
  }

  /**
   * 当前请求体来源（渲染层摘要展示用）：
   * - 'multipart' → 有 ≥1 个有效文件端口，run() 会拼 multipart/form-data
   * - 'text' → 走 bodyText 文本模板路径
   * - 'none' → 方法不支持 body 或 body 为空
   */
  get bodySource(): 'multipart' | 'text' | 'none' {
    if (!this.methodAllowsBody) return 'none'
    if (this.activeFileValues().length >= 1) return 'multipart'
    return this.bodyText ? 'text' : 'none'
  }

  /** 当前有效文件端口数量（有 FileValue 且非 null） */
  get activeFileCount(): number {
    return this.activeFileValues().length
  }

  /** 文件端口总数 */
  get filePortCount(): number {
    return this.fileInputPorts.length
  }

  /** 当前有效文件的文件名列表（渲染层摘要展示用） */
  get displayFileBodyNames(): readonly string[] {
    return this.activeFileValues()
      .map(v => v.file?.name ?? '')
      .filter(Boolean)
  }

  /** 渲染层读折叠状态（true = 折叠中） */
  get displayCollapsed(): boolean {
    return this.collapsed
  }

  /** 切换折叠；渲染层 watch 到 expanded 变化后会自行测量 scrollHeight 调 setBox */
  setCollapsed(collapsed: boolean): void {
    if (this.collapsed === collapsed) return
    this.collapsed = collapsed
    this.notifyChanged()
  }

  // —— 用户操作 ——

  /** 设置 HTTP 方法（UI 下拉） */
  setMethod(method: HttpMethod): void {
    if (method === this.method) return
    this.method = method
    this.notifyChanged()
  }

  /** 设置 URL 模板；改完立即重算最终 URL */
  setUrlTemplate(text: string): void {
    if (text === this.urlTemplate) return
    this.urlTemplate = text
    this.recompute()
    this.notifyChanged()
  }

  /** 替换整个 headers KV 列表（UI 改了某条就整个传进来） */
  setHeaders(list: HeaderEntry[]): void {
    // 做一次浅拷贝，避免 UI 侧直接改引用导致无法比较
    const normalized = list.map((e) => ({ key: e.key, value: e.value }))
    if (headerListsEqual(this.headers, normalized)) return
    this.headers = normalized
    this.recompute()
    this.notifyChanged()
  }

  /** 在末尾追加一条空 header */
  addHeader(): void {
    this.setHeaders([...this.headers, { key: '', value: '' }])
  }

  /** 删除第 idx 条 header */
  removeHeader(idx: number): void {
    if (idx < 0 || idx >= this.headers.length) return
    const next = this.headers.slice()
    next.splice(idx, 1)
    this.setHeaders(next)
  }

  /** 设置请求体文本 */
  setBodyText(text: string): void {
    if (text === this.bodyText) return
    this.bodyText = text
    this.recompute()
    this.notifyChanged()
  }

  /** 设置超时毫秒；夹到 [1000, 600000] */
  setTimeoutMs(ms: number): void {
    const clamped = Math.max(1000, Math.min(600_000, Math.round(ms)))
    if (clamped === this.timeoutMs) return
    this.timeoutMs = clamped
    this.notifyChanged()
  }

  /** 追加一个模板输入端口，编号接在当前末尾之后（id: pN） */
  addInputPort(): void {
    this.portSeq += 1
    const port = new InputPort(`p${this.portSeq}`, {
      accepts: [StringValue],
      label: { zh: `$${this.templateInputPorts.length + 1}`, en: `$${this.templateInputPorts.length + 1}` }
    })
    this.addInput(port)
    this.recompute()
  }

  /** 追加一个文件输入端口（id: fN），配 multipart fieldName（默认 'file'） */
  addFilePort(fieldName = 'file'): InputPort {
    this.filePortSeq += 1
    const port = new InputPort(`f${this.filePortSeq}`, {
      accepts: [FileValue],
      label: { zh: fieldName, en: fieldName }
    })
    this.filePortFields.set(port.id, fieldName)
    this.addInput(port)
    this.recompute()
    return port
  }

  /** 移除末尾的文件端口；断开其上的连线；至少保留 1 个 */
  removeLastFilePort(): void {
    const filePorts = this.fileInputPorts
    if (filePorts.length <= 1) return
    const last = filePorts[filePorts.length - 1]
    if (!last) return
    this.filePortFields.delete(last.id)
    this.removeInput(last)
    this.recompute()
  }

  /** 设置某文件端口的 multipart fieldName（默认 'file'） */
  setFilePortField(portId: string, fieldName: string): void {
    const name = fieldName.trim() || 'file'
    const port = this.inputPorts.find(p => p.id === portId)
    if (!port) return
    this.filePortFields.set(portId, name)
    port.setLabel({ zh: name, en: name })
    this.notifyChanged()
  }

  /** 取某文件端口的 fieldName（默认 'file'） */
  getFilePortField(portId: string): string {
    return this.filePortFields.get(portId) ?? 'file'
  }

  /** 移除末尾的模板输入端口；断开其上的连线；至少保留 1 个 */
  removeLastInputPort(): void {
    const templatePorts = this.templateInputPorts
    if (templatePorts.length <= 1) return
    const last = templatePorts[templatePorts.length - 1]
    if (!last) return
    this.removeInput(last)
    this.recompute()
  }

  /** 任一输入到达 → 检测所有端口是否占满，满了自动加一个；然后重算 URL / headers / body */
  inputPortReceiveValue(_ports: InputPort[]): void {
    if (this.allPortsFull()) {
      this.addInputPort()
    }
    this.recompute()
    this.notifyChanged()
  }

  /** 是否所有模板输入端口都已被连边占用（文件端口不参与自动扩口判断） */
  private allPortsFull(): boolean {
    const templatePorts = this.templateInputPorts
    if (templatePorts.length === 0) return false
    return templatePorts.every((p) => p.incomingEdgeCount > 0)
  }

  /** 只参与 $N 模板替换的端口（模板端口 id 以 p 开头） */
  private get templateInputPorts(): readonly InputPort[] {
    return this.inputPorts.filter(p => p.id.startsWith('p'))
  }

  /** 文件输入端口列表（id 以 f 开头） */
  get fileInputPorts(): readonly InputPort[] {
    return this.inputPorts.filter(p => p.id.startsWith('f'))
  }

  /** 文件端口中有 FileValue 且非 null 的值（run() 用） */
  private activeFileValues(): readonly FileValue[] {
    const out: FileValue[] = []
    for (const port of this.fileInputPorts) {
      const [first] = port.value
      if (first instanceof FileValue && !first.isNull && first.file) {
        out.push(first)
      }
    }
    return out
  }

  /**
   * 把模板里的 $1 $2 $3 … 按输入端口当前值替换掉。
   * 缺值 / 无对应端口时该占位符替换为空串；$$ 转义成字面量 $。
   *
   * 只对 StringValue 做替换——端口类型被上游串成 FileValue 时，模板占位符视为无值。
   */
  private replacePlaceholders(text: string): string {
    return text.replace(/\$\$|\$(\d+)/g, (_match, digits: string | undefined) => {
      if (digits === undefined) return '$'
      const index = Number(digits) - 1
      const port = this.templateInputPorts[index]
      if (!port) return ''
      const [first] = port.value
      return first instanceof StringValue && !first.isNull ? first.value! : ''
    })
  }

  /** 重算 URL / headers / body 的占位符替换结果 */
  private recompute(): void {
    this.resolvedUrl = this.replacePlaceholders(this.urlTemplate)
    this.resolvedHeaders = this.headers.map((e) => ({
      key: this.replacePlaceholders(e.key),
      value: this.replacePlaceholders(e.value)
    }))
    this.resolvedBodyText = this.replacePlaceholders(this.bodyText)
  }

  /**
   * 发送当前请求。UI 的「发送」按钮点击时调用。
   *
   * 流程：
   * 1. 校验 URL 非空；headers KV → Record；
   * 2. 主进程 httpApi.request；
   * 3. 根据返回更新状态 + commit 响应体到输出端口。
   */
  async run(): Promise<void> {
    // 跑之前强制重算一次——解决"画布加载时上游值已在端口里、但 header/body 模板里的 $N 是之前缓存的空值"这种
    // inputPortReceiveValue 没触发、resolvedXxx 没刷新的场景。run() 是最终时刻，必须用最新值。
    this.recompute()

    const url = this.resolvedUrl.trim()
    if (!url) {
      this.status = 'error'
      this.lastError = 'URL 不能为空'
      this.lastStatus = 0
      this.lastStatusText = ''
      this.lastBody = ''
      this.notifyChanged()
      return
    }
    // 引擎层 running guard：beginRun() 内部会判断 nodeState === 'running' 并 return
    // 这里先标记我们自己的 UI status，beginRun() 负责锁输入端口
    this.beginRun()
    this.status = 'running'
    this.lastStatus = 0
    this.lastStatusText = ''
    this.lastBody = ''
    this.lastError = ''
    this.notifyChanged()

    // headers KV → Record（空 key 跳过；value 允许空串）
    const parsedHeaders: Record<string, string> = {}
    for (const h of this.resolvedHeaders) {
      const k = h.key.trim()
      if (!k) continue
      parsedHeaders[k] = h.value
    }

    // —— 构造请求体 ——
    let body: string | ArrayBuffer | undefined = undefined
    let autoContentType: string | undefined
    if (this.methodAllowsBody) {
      const files = this.activeFileValues()

      if (files.length >= 1) {
        // multipart/form-data：不管 1 个还是多个文件都走 multipart
        // （PHP $_FILES / multer 等标准服务端文件上传接口都只认 multipart 格式）
        const parts: { fieldName: string; filename: string; mimeType: string; data: ArrayBuffer }[] = []
        for (const port of this.fileInputPorts) {
          const [fv] = port.value
          if (fv instanceof FileValue && !fv.isNull && fv.file) {
            const ab = await fv.file.arrayBuffer()
            parts.push({
              fieldName: this.filePortFields.get(port.id) ?? 'file',
              filename: fv.file.name,
              mimeType: fv.file.type || 'application/octet-stream',
              data: ab
            })
          }
        }
        const mb = buildMultipartBody(parts)
        body = mb.buffer
        autoContentType = `multipart/form-data; boundary=${mb.boundary}`

        // eslint-disable-next-line no-console
        console.info('[http-request] 文件体构造:', {
          fileCount: parts.length,
          parts: parts.map(p => ({ fieldName: p.fieldName, filename: p.filename, mimeType: p.mimeType, size: p.data.byteLength })),
          multipartBodySize: mb.buffer.byteLength,
          contentType: autoContentType
        })
      } else {
        // 文本模板路径（原有逻辑）
        body = this.resolvedBodyText || undefined
      }
    }

    // —— 注入自动 Content-Type（multipart 场景；用户手动设的 Content-Type 优先） ——
    if (autoContentType && !hasContentTypeHeader(parsedHeaders)) {
      parsedHeaders['Content-Type'] = autoContentType
    } else if (autoContentType && hasContentTypeHeader(parsedHeaders)) {
      // eslint-disable-next-line no-console
      console.info('[http-request] 检测到 multipart 但用户已手动设置 Content-Type，跳过自动注入')
    }
    const finalHasHeaders = Object.keys(parsedHeaders).length > 0

    let result:
      | {
          ok: true
          status: number
          statusText: string
          headers: Record<string, string>
          body: string
          bodyBase64?: string
          contentType?: string
          ext?: string
        }
      | { ok: false; error: string }
    try {
      // @ts-ignore — tsconfig.node.json 编译本文件时不把 preload 的 Window 扩展带进来，
      // 但运行时本文件只在 renderer 里执行，window.httpApi 一定存在
      result = await window.httpApi.request({
        url,
        method: this.method,
        headers: finalHasHeaders ? parsedHeaders : undefined,
        body,
        timeout: this.timeoutMs
      })
    } catch (err) {
      result = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }

    if (result.ok) {
      this.status = 'done'
      this.lastStatus = result.status
      this.lastStatusText = result.statusText
      this.lastBody = result.body
      this.lastError = ''
      // 按 outputMode 构造对应 Value，commit 到同一个 textOutput（类型已由 setOutputMode 预先对齐）
      if (this.outputMode === 'text') {
        this.textOutput.commit(new StringValue(result.body))
      } else {
        // image / audio 模式：只有主进程识别为媒体类型响应时才有 bodyBase64
        if (result.bodyBase64) {
          try {
            const bytes = base64ToBytes(result.bodyBase64)
            const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
            const defaultExt = this.outputMode === 'image' ? 'png' : 'wav'
            const defaultCt = this.outputMode === 'image' ? 'image/png' : 'audio/wav'
            const file = new File([ab], `http-response.${result.ext ?? defaultExt}`, {
              type: result.contentType ?? defaultCt
            })
            const hash = djb2(result.bodyBase64)
            const FileValueCls = this.outputMode === 'image' ? ImgFileValue : AudioFileValue
            this.textOutput.commit(new FileValueCls(file, hash))
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[http-request] imageOutput 构造失败：', err)
          }
        } else {
          // 响应 Content-Type 不是 image/*，无 bodyBase64 → 不出值
          this.textOutput.clear()
        }
      }
      this.completeRun()
    } else {
      this.status = 'error'
      this.lastStatus = 0
      this.lastStatusText = ''
      this.lastBody = ''
      this.lastError = result.error
      this.failRun()
    }
    this.notifyChanged()
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      ...super.saveState(),
      method: this.method,
      urlTemplate: this.urlTemplate,
      headers: this.headers,
      bodyText: this.bodyText,
      timeoutMs: this.timeoutMs,
      collapsed: this.collapsed,
      outputMode: this.outputMode,
      // 模板端口数量
      templateInputCount: this.templateInputPorts.length,
      // 文件端口数量 + 每个端口的 fieldName
      fileInputCount: this.fileInputPorts.length,
      filePortFields: Object.fromEntries(this.filePortFields),
      // filePortSeq 让恢复时端口 id 编号能续上
      filePortSeq: this.filePortSeq
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    if (typeof state.method === 'string' && ALL_METHODS.includes(state.method as HttpMethod)) {
      this.method = state.method as HttpMethod
    }
    if (typeof state.urlTemplate === 'string') {
      this.urlTemplate = state.urlTemplate
    }
    if (typeof state.collapsed === 'boolean') {
      this.collapsed = state.collapsed
    }
    if (state.outputMode === 'text' || state.outputMode === 'image' || state.outputMode === 'audio') {
      this.outputMode = state.outputMode
    }
    // outputMode 恢复后，同步重建 OutputPort 的 Value 类型——端口构造时默认 StringValue，
    // 只设字段值不会动端口类型，导致重启后节点认为自己还是 text 模式。
    this.rebuildOutputPortForMode()
    // 新格式：headers 是 KV 数组
    if (Array.isArray(state.headers)) {
      this.headers = state.headers
        .map((h) => {
          if (typeof h === 'object' && h !== null) {
            const entry = h as Record<string, unknown>
            return {
              key: typeof entry.key === 'string' ? entry.key : '',
              value: typeof entry.value === 'string' ? entry.value : ''
            }
          }
          return null
        })
        .filter((x): x is HeaderEntry => x !== null)
    } else if (typeof state.headersText === 'string' && state.headersText.trim()) {
      // 旧格式兼容：headersText 是 JSON，转成 KV
      try {
        const obj = JSON.parse(state.headersText) as Record<string, unknown>
        this.headers = Object.entries(obj)
          .map(([k, v]) => ({ key: k, value: v !== null && v !== undefined ? String(v) : '' }))
      } catch {
        this.headers = []
      }
    }
    if (typeof state.bodyText === 'string') {
      this.bodyText = state.bodyText
    }
    if (typeof state.timeoutMs === 'number') {
      this.timeoutMs = Math.max(1000, Math.min(600_000, Math.round(state.timeoutMs)))
    }
    // 端口重建：先清干净所有端口，再按存的数量重建文件端口 + 模板端口
    // 新格式存 templateInputCount / fileInputCount / filePortFields；
    // 旧格式（单 fileBodyPort）存 inputCount 或 templateInputCount=1 + fileInputCount 缺失
    const savedTemplateCount = typeof state.templateInputCount === 'number'
      ? state.templateInputCount
      : (typeof state.inputCount === 'number' ? state.inputCount : this.inputPorts.length - 1)
    const savedFileCount = typeof state.fileInputCount === 'number'
      ? state.fileInputCount
      : (typeof state.inputCount === 'number' ? 1 : 1) // 旧数据默认 1 个文件端口
    const wantedTemplate = Math.max(1, Math.floor(savedTemplateCount))
    const wantedFile = Math.max(1, Math.floor(savedFileCount))
    if (typeof state.filePortSeq === 'number') {
      this.filePortSeq = state.filePortSeq
    }

    // 清掉所有现有端口（removeLastInputPort 不碰文件端口，得直接 removeInput）
    while (this.inputPorts.length > 0) {
      const p = this.inputPorts[this.inputPorts.length - 1]!
      this.removeInput(p)
    }

    // 重建文件端口：先重建 filePortSeq 到正确的值，再逐个加
    // 因为 addFilePort 内部会 ++filePortSeq，我们把它调到 wantedFile 之前
    this.filePortSeq = 0
    this.filePortFields.clear()
    const savedFields = state.filePortFields && typeof state.filePortFields === 'object'
      ? state.filePortFields as Record<string, unknown>
      : null
    for (let i = 0; i < wantedFile; i += 1) {
      const fieldId = `f${i + 1}`
      const fieldName = savedFields && typeof savedFields[fieldId] === 'string'
        ? savedFields[fieldId] as string
        : 'file'
      this.addFilePort(fieldName)
    }

    // 重建模板端口
    for (let i = 0; i < wantedTemplate; i += 1) {
      this.addInputPort()
    }

    this.recompute()
    this.notifyChanged()
  }
}

// —— 模块级工具 ——

/** 比较两个 HeaderEntry[] 是否内容相等（浅比较） */
function headerListsEqual(a: HeaderEntry[], b: HeaderEntry[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].key !== b[i].key || a[i].value !== b[i].value) return false
  }
  return true
}

/** 检查 headers 里是否已有 Content-Type（大小写不敏感） */
function hasContentTypeHeader(headers: Record<string, string>): boolean {
  return Object.keys(headers).some(k => k.toLowerCase() === 'content-type')
}

/** multipart/form-data 的 part 定义（每个 part 对应一个文件端口） */
interface MultipartFilePart {
  fieldName: string
  filename: string
  mimeType: string
  data: ArrayBuffer
}

/**
 * 手动拼 multipart/form-data body。
 * 不走 FormData（渲染进程里 FormData 给 fetch 用的，Node http/https 不认），
 * 直接按 RFC 7578 格式拼字节，返回 { buffer, boundary }。
 */
function buildMultipartBody(parts: MultipartFilePart[]): { buffer: ArrayBuffer; boundary: string } {
  const boundary = `----CanvasDeskBoundary${Date.now()}${Math.random().toString(36).slice(2, 10)}`
  const CRLF = '\r\n'

  // 先算每段的字节长度，一次性分配 Buffer
  const encoder = new TextEncoder()
  const segments: Uint8Array[] = []
  let totalLen = 0

  for (const part of parts) {
    const header =
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="${part.fieldName}"; filename="${part.filename}"${CRLF}` +
      `Content-Type: ${part.mimeType}${CRLF}${CRLF}`
    const headerBytes = encoder.encode(header)
    segments.push(headerBytes)
    totalLen += headerBytes.length

    const fileBytes = new Uint8Array(part.data)
    segments.push(fileBytes)
    totalLen += fileBytes.length

    const closing = encoder.encode(CRLF)
    segments.push(closing)
    totalLen += closing.length
  }

  const finalBoundary = encoder.encode(`--${boundary}--${CRLF}`)
  segments.push(finalBoundary)
  totalLen += finalBoundary.length

  // 合并
  const out = new Uint8Array(totalLen)
  let offset = 0
  for (const seg of segments) {
    out.set(seg, offset)
    offset += seg.length
  }

  return { buffer: out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength), boundary }
}
