import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** HTTP 方法（大写，constructor 里会 toUpperCase） */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'

/** 请求状态：UI 据此决定按钮可点 / 结果区样式 */
export type HttpRequestStatus = 'idle' | 'running' | 'done' | 'error'

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
export class HttpRequestNode extends Node {
  static readonly TYPE = 'http-request'
  readonly type = HttpRequestNode.TYPE

  /** 输出端口：响应 body 文本 */
  readonly textOutput = new OutputPort('text', StringValue, {
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

  /** 端口 id 自增序号，保证 id 唯一（与 $N 的编号无关） */
  private portSeq = 0

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
  private static readonly EXPANDED_BOX: [number, number] = [360, 420]

  constructor(id: string) {
    super(id)
    this.addOutput(this.textOutput)
    // 默认给一个输入端口，方便直接开用
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

  /** 当前输入端口数量 */
  get inputCount(): number {
    return this.inputPorts.length
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

  /** 设置超时毫秒；夹到 [1000, 60000] */
  setTimeoutMs(ms: number): void {
    const clamped = Math.max(1000, Math.min(60_000, Math.round(ms)))
    if (clamped === this.timeoutMs) return
    this.timeoutMs = clamped
    this.notifyChanged()
  }

  /** 追加一个输入端口，编号接在当前末尾之后 */
  addInputPort(): void {
    this.portSeq += 1
    const port = new InputPort(`p${this.portSeq}`, {
      accepts: [StringValue],
      label: { zh: `$${this.inputPorts.length + 1}`, en: `$${this.inputPorts.length + 1}` }
    })
    this.addInput(port)
    this.recompute()
  }

  /** 移除末尾的输入端口；断开其上的连线；至少保留 1 个 */
  removeLastInputPort(): void {
    if (this.inputPorts.length <= 1) return
    const last = this.inputPorts[this.inputPorts.length - 1]
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

  /** 是否所有输入端口都已被连边占用 */
  private allPortsFull(): boolean {
    if (this.inputPorts.length === 0) return false
    return this.inputPorts.every((p) => p.incomingEdgeCount > 0)
  }

  /**
   * 把模板里的 $1 $2 $3 … 按输入端口当前值替换掉。
   * 缺值 / 无对应端口时该占位符替换为空串；$$ 转义成字面量 $。
   */
  private replacePlaceholders(text: string): string {
    return text.replace(/\$\$|\$(\d+)/g, (_match, digits: string | undefined) => {
      if (digits === undefined) return '$'
      const index = Number(digits) - 1
      const port = this.inputPorts[index]
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
    // 上一次还没跑完就不重复触发
    if (this.status === 'running') return

    // headers KV → Record（空 key 跳过；value 允许空串）
    const parsedHeaders: Record<string, string> = {}
    for (const h of this.resolvedHeaders) {
      const k = h.key.trim()
      if (!k) continue
      parsedHeaders[k] = h.value
    }
    const hasHeaders = Object.keys(parsedHeaders).length > 0

    this.status = 'running'
    this.lastStatus = 0
    this.lastStatusText = ''
    this.lastBody = ''
    this.lastError = ''
    this.notifyChanged()

    let result:
      | { ok: true; status: number; statusText: string; headers: Record<string, string>; body: string }
      | { ok: false; error: string }
    try {
      // @ts-ignore — tsconfig.node.json 编译本文件时不把 preload 的 Window 扩展带进来，
      // 但运行时本文件只在 renderer 里执行，window.httpApi 一定存在
      result = await window.httpApi.request({
        url,
        method: this.method,
        headers: hasHeaders ? parsedHeaders : undefined,
        body: this.methodAllowsBody ? this.resolvedBodyText : undefined,
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
      // 响应体发给下游（不管 2xx 还是 4xx/5xx）
      this.textOutput.commit(new StringValue(result.body))
    } else {
      this.status = 'error'
      this.lastStatus = 0
      this.lastStatusText = ''
      this.lastBody = ''
      this.lastError = result.error
    }
    this.notifyChanged()
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      method: this.method,
      urlTemplate: this.urlTemplate,
      headers: this.headers,
      bodyText: this.bodyText,
      timeoutMs: this.timeoutMs,
      collapsed: this.collapsed,
      // 端口数量：恢复时按此重建端口，边才能重新接上
      inputCount: this.inputPorts.length
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.method === 'string' && ALL_METHODS.includes(state.method as HttpMethod)) {
      this.method = state.method as HttpMethod
    }
    if (typeof state.urlTemplate === 'string') {
      this.urlTemplate = state.urlTemplate
    }
    if (typeof state.collapsed === 'boolean') {
      this.collapsed = state.collapsed
      // 冷启动先给一个合理的 box 高度（跟 render.vue COLLAPSED_MIN 对齐），
      // render.vue adjustBoxHeight 上来后会再用 scrollHeight 精调
      if (this.collapsed) {
        this.setBox(HttpRequestNode.EXPANDED_BOX[0], 150)
      }
    }
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
      this.timeoutMs = Math.max(1000, Math.min(60_000, Math.round(state.timeoutMs)))
    }
    // 按存储的端口数量重建端口。先直接 removeInput 清干净（绕过 removeLastInputPort 的底线），再重建。
    const wanted = typeof state.inputCount === 'number' ? Math.max(1, Math.floor(state.inputCount)) : this.inputPorts.length
    while (this.inputPorts.length > 0) {
      const p = this.inputPorts[this.inputPorts.length - 1]!
      this.removeInput(p)
    }
    for (let i = 0; i < wanted; i += 1) {
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
