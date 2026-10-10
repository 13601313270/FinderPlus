import { StringValue } from '../../engine/data/StringValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** 提取模式 */
export type ExtractMode = 'text' | 'html' | 'attr'

/** 爬虫状态（UI 据此决定按钮可点 / 结果区样式） */
export type CrawlerStatus = 'idle' | 'running' | 'done' | 'error'

/** 默认超时：毫秒 */
const DEFAULT_TIMEOUT = 15_000

/** 可用的提取模式列表（UI 下拉用） */
const ALL_MODES: readonly ExtractMode[] = ['text', 'html', 'attr']

/**
 * 爬虫节点：给一个 URL 和 CSS 选择器，主进程抓 HTML + cheerio 解析，
 * 把匹配元素按选定模式提取后以 JSON 数组输出。
 *
 * URL 支持 $1 $2 … 占位符（同 HttpRequestNode），由动态输入端口注入。
 * 输出端口 results 是 JsonValue（数组），rawHtml 是可选原始 HTML（StringValue）。
 */
export class CrawlerNode extends Node {
  static readonly TYPE = 'crawler'
  readonly type = CrawlerNode.TYPE

  /** 输出端口：提取结果数组（JSON） */
  readonly resultsOutput = new OutputPort('results', JsonValue, {
    zh: '提取结果',
    en: 'Results',
    ja: '抽出結果',
    ko: '추출 결과',
    es: 'Resultados',
    ar: 'النتائج',
    fr: 'Résultats',
    pt: 'Resultados',
    ru: 'Результаты',
    hi: 'परिणाम',
    id: 'Hasil',
    de: 'Ergebnisse',
    vi: 'Kết quả',
    tr: 'Sonuçlar',
    it: 'Risultati'
  })

  /** 输出端口：原始 HTML */
  readonly rawHtmlOutput = new OutputPort('rawHtml', StringValue, {
    zh: '原始 HTML',
    en: 'Raw HTML',
    ja: '生 HTML',
    ko: '원본 HTML',
    es: 'HTML sin procesar',
    ar: 'HTML الخام',
    fr: 'HTML brut',
    pt: 'HTML bruto',
    ru: 'Исходный HTML',
    hi: 'कच्चा HTML',
    id: 'HTML mentah',
    de: 'Roh-HTML',
    vi: 'HTML gốc',
    tr: 'Ham HTML',
    it: 'HTML grezzo'
  })

  /** 方法端口：上游 commit 任意值即触发一次抓取 */
  readonly triggerPort = new MethodPort('trigger', {
    label: {
      zh: '抓取',
      en: 'Scrape',
      ja: 'スクレイプ',
      ko: '스크레이프',
      es: 'Rastrear',
      ar: 'تتبع',
      fr: 'Extraire',
      pt: 'Raspar',
      ru: 'Собрать',
      hi: 'स्क्रैप',
      id: 'Scrape',
      de: 'Scrapen',
      vi: 'Thu thập',
      tr: 'Kazımak',
      it: 'Raccogli'
    }
  })

  // —— 持久化字段 ——

  /** URL 模板（含 $N 占位符） */
  private urlTemplate = ''

  /** CSS 选择器 */
  private selector = ''

  /** 提取模式 */
  private extractMode: ExtractMode = 'text'

  /** 当 extractMode='attr' 时要提取的属性名 */
  private attrName = ''

  /** 超时毫秒 */
  private timeoutMs = DEFAULT_TIMEOUT

  /** 可选的自定义 headers（JSON 字符串，解析后传给主进程） */
  private headersText = ''

  /** 可选的自定义 User-Agent；为空时主进程用内置 Chrome UA */
  private userAgent = ''

  /** 端口 id 自增序号 */
  private portSeq = 0

  // —— 派生状态（不持久化） ——

  /** 按模板 + 当前输入值生成的最终 URL */
  private resolvedUrl = ''

  private status: CrawlerStatus = 'idle'
  private lastStatus = 0
  private lastCount = 0
  private lastError = ''
  private lastResultsPreview = ''

  constructor(id: string) {
    super(id)
    this.addOutput(this.rawHtmlOutput)
    this.addOutput(this.resultsOutput)
    this.addMethod(this.triggerPort)
    this.triggerPort.onTrigger(() => { void this.run() })
    // 默认给一个输入端口，方便直接开用
    this.addInputPort()
    // 内容区硬约束
    this.setBox(260, 178)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不处理
  }

  // —— 渲染层读的状态 ——

  /** URL 模板原文 */
  get displayUrlTemplate(): string {
    return this.urlTemplate
  }

  /** 最终 URL */
  get displayResolvedUrl(): string {
    return this.resolvedUrl
  }

  /** CSS 选择器 */
  get displaySelector(): string {
    return this.selector
  }

  /** 当前提取模式 */
  get displayExtractMode(): ExtractMode {
    return this.extractMode
  }

  /** 可用模式列表 */
  get availableModes(): readonly ExtractMode[] {
    return ALL_MODES
  }

  /** 属性名 */
  get displayAttrName(): string {
    return this.attrName
  }

  /** 超时毫秒 */
  get displayTimeout(): number {
    return this.timeoutMs
  }

  /** headers JSON 文本 */
  get displayHeadersText(): string {
    return this.headersText
  }

  /** 输入端口数量 */
  get inputCount(): number {
    return this.inputPorts.length
  }

  get displayStatus(): CrawlerStatus {
    return this.status
  }

  get displayLastStatus(): number {
    return this.lastStatus
  }

  get displayLastCount(): number {
    return this.lastCount
  }

  get displayLastError(): string {
    return this.lastError
  }

  /** 结果预览（前 200 字符） */
  get displayLastResultsPreview(): string {
    return this.lastResultsPreview
  }

  /** 提取模式是否需要 attrName */
  get modeNeedsAttr(): boolean {
    return this.extractMode === 'attr'
  }

  // —— 用户操作 ——

  /** 设置 URL 模板 */
  setUrlTemplate(text: string): void {
    if (text === this.urlTemplate) return
    this.urlTemplate = text
    this.recompute()
    this.notifyChanged()
  }

  /** 设置 CSS 选择器 */
  setSelector(text: string): void {
    if (text === this.selector) return
    this.selector = text
    this.notifyChanged()
  }

  /** 设置提取模式 */
  setExtractMode(mode: ExtractMode): void {
    if (mode === this.extractMode) return
    this.extractMode = mode
    this.notifyChanged()
  }

  /** 设置属性名 */
  setAttrName(text: string): void {
    if (text === this.attrName) return
    this.attrName = text
    this.notifyChanged()
  }

  /** 设置超时 */
  setTimeoutMs(ms: number): void {
    const clamped = Math.max(1000, Math.min(60_000, Math.round(ms)))
    if (clamped === this.timeoutMs) return
    this.timeoutMs = clamped
    this.notifyChanged()
  }

  /** 设置 headers JSON 文本 */
  setHeadersText(text: string): void {
    if (text === this.headersText) return
    this.headersText = text
    this.notifyChanged()
  }

  /** User-Agent 读取 */
  get displayUserAgent(): string {
    return this.userAgent
  }

  /** 设置 User-Agent（空串用主进程默认） */
  setUserAgent(text: string): void {
    if (text === this.userAgent) return
    this.userAgent = text
    this.notifyChanged()
  }

  /** 追加一个输入端口 */
  addInputPort(): void {
    this.portSeq += 1
    const port = new InputPort(`p${this.portSeq}`, {
      accepts: [StringValue],
      label: { zh: `$${this.inputPorts.length + 1}`, en: `$${this.inputPorts.length + 1}` }
    })
    this.addInput(port)
    this.recompute()
  }

  /** 移除末尾输入端口；至少保留 1 个 */
  removeLastInputPort(): void {
    if (this.inputPorts.length <= 1) return
    const last = this.inputPorts[this.inputPorts.length - 1]
    if (!last) return
    this.removeInput(last)
    this.recompute()
  }

  /** 任一输入到达 → 检测所有端口是否占满，满了自动加一个；然后重算 URL */
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

  /** 把模板里的 $1 $2 $3 … 按输入端口当前值替换掉 */
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

  /** 重算 URL 的占位符替换结果 */
  private recompute(): void {
    this.resolvedUrl = this.replacePlaceholders(this.urlTemplate)
  }

  /**
   * 解析 headers JSON 文本。空串返回 undefined；解析失败返回 null 表示有错。
   */
  private parseHeaders(): Record<string, string> | null | undefined {
    const raw = this.headersText.trim()
    if (!raw) return undefined
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(obj)) {
        out[k] = v !== null && v !== undefined ? String(v) : ''
      }
      return out
    } catch {
      return null
    }
  }

  /**
   * 执行抓取。UI 的「抓取」按钮 / MethodPort trigger 都会调这里。
   */
  async run(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[CrawlerNode] run() START', { id: this.id, urlTemplate: this.urlTemplate, selector: this.selector, mode: this.extractMode })

    // 跑之前强制重算一次 URL
    this.recompute()

    // strip 首尾的反引号 / 引号，避免用户从 Markdown 里复制粘贴进来
    const url = this.resolvedUrl.trim().replace(/^[`"'\s]+|[`"'\s]+$/g, '')
    if (!url) {
      // eslint-disable-next-line no-console
      console.warn('[CrawlerNode] run() ABORT: URL empty')
      this.status = 'error'
      this.lastError = 'URL 不能为空'
      this.lastStatus = 0
      this.lastCount = 0
      this.lastResultsPreview = ''
      this.notifyChanged()
      return
    }
    if (!this.selector.trim() && this.extractMode === 'attr') {
      this.status = 'error'
      this.lastError = '属性名不能为空（提取模式为 attr 时）'
      this.lastStatus = 0
      this.lastCount = 0
      this.lastResultsPreview = ''
      this.notifyChanged()
      return
    }

    // 上一次还没跑完就不重复触发
    if (this.status === 'running') {
      // eslint-disable-next-line no-console
      console.warn('[CrawlerNode] run() SKIP: already running')
      return
    }

    // 解析 headers
    const parsedHeaders = this.parseHeaders()
    if (parsedHeaders === null) {
      this.status = 'error'
      this.lastError = 'headers JSON 格式错误'
      this.notifyChanged()
      return
    }

    this.status = 'running'
    this.lastStatus = 0
    this.lastCount = 0
    this.lastError = ''
    this.lastResultsPreview = ''
    this.notifyChanged()

    // eslint-disable-next-line no-console
    console.log('[CrawlerNode] IPC scrape CALL', { url, selector: this.selector.trim(), mode: this.extractMode, hasHeaders: !!parsedHeaders, timeout: this.timeoutMs })

    let result:
      | { ok: true; status: number; count: number; results: unknown[]; rawHtml?: string }
      | { ok: false; error: string }
    try {
      // @ts-ignore — 渲染进程里 window.crawlerApi 一定存在
      result = await window.crawlerApi.scrape({
        url,
        headers: parsedHeaders,
        timeout: this.timeoutMs,
        selector: this.selector.trim(),
        extractMode: this.extractMode,
        attrName: this.extractMode === 'attr' ? this.attrName.trim() : undefined,
        includeRawHtml: true,  // 始终让主进程返回 rawHtml，简化下游取值
        userAgent: this.userAgent.trim() || undefined
      })
    } catch (err) {
      result = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }

    // eslint-disable-next-line no-console
    console.log('[CrawlerNode] IPC scrape RETURN', result)

    if (result.ok) {
      this.status = 'done'
      this.lastStatus = result.status
      this.lastCount = result.count
      this.lastError = ''
      // 结果预览
      const jsonStr = JSON.stringify(result.results)
      this.lastResultsPreview = jsonStr.length > 200 ? jsonStr.slice(0, 200) + '…' : jsonStr

      // —— 检查输出端口下游连边情况 ——
      // eslint-disable-next-line no-console
      console.log('[CrawlerNode] resultsOutput edges:', this.resultsOutput.edges.size, 'rawHtmlOutput edges:', this.rawHtmlOutput.edges.size)

      // commit 输出
      const resultsValue = new JsonValue(result.results)
      // eslint-disable-next-line no-console
      console.log('[CrawlerNode] commit resultsOutput', { fingerprint: resultsValue.fingerprint, valueKind: resultsValue.constructor.name, edgeCount: this.resultsOutput.edges.size })
      this.resultsOutput.commit(resultsValue)

      // rawHtml 始终 commit——任何网址都有原始 HTML，不应该让用户开开关才能拿
      const rawValue = new StringValue(result.rawHtml ?? '')
      // eslint-disable-next-line no-console
      console.log('[CrawlerNode] commit rawHtmlOutput', { len: result.rawHtml?.length ?? 0, edgeCount: this.rawHtmlOutput.edges.size })
      this.rawHtmlOutput.commit(rawValue)
    } else {
      this.status = 'error'
      this.lastStatus = 0
      this.lastCount = 0
      this.lastError = result.error
      this.lastResultsPreview = ''
      // eslint-disable-next-line no-console
      console.error('[CrawlerNode] scrape FAILED:', result.error)
    }
    this.notifyChanged()
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      urlTemplate: this.urlTemplate,
      selector: this.selector,
      extractMode: this.extractMode,
      attrName: this.attrName,
      timeoutMs: this.timeoutMs,
      headersText: this.headersText,
      userAgent: this.userAgent,
      inputCount: this.inputPorts.length
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.urlTemplate === 'string') this.urlTemplate = state.urlTemplate
    if (typeof state.selector === 'string') this.selector = state.selector
    if (typeof state.extractMode === 'string' && ALL_MODES.includes(state.extractMode as ExtractMode)) {
      this.extractMode = state.extractMode as ExtractMode
    }
    if (typeof state.attrName === 'string') this.attrName = state.attrName
    if (typeof state.timeoutMs === 'number') {
      this.timeoutMs = Math.max(1000, Math.min(60_000, Math.round(state.timeoutMs)))
    }
    // includeRawHtml 已废弃，跳过兼容老版本存档
    if (typeof state.headersText === 'string') this.headersText = state.headersText
    if (typeof state.userAgent === 'string') this.userAgent = state.userAgent

    // 重建端口
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
