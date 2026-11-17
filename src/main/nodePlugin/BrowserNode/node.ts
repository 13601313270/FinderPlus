import { StringValue } from '../../engine/data/StringValue'
import { VideoFileValue } from '../../engine/data/VideoFileValue'
import { HtmlFileValue } from '../../engine/data/HtmlFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** BrowserNode 运行时状态（UI 据此决定工具栏按钮可点 / 加载指示） */
export type BrowserStatus = 'idle' | 'loading' | 'ready' | 'error'

const MIN_URL_LEN = 4
const MAX_URL_LEN = 2000
const MAX_SCRIPT_LEN = 10000

/**
 * 浏览器身份模式：
 * - 独立：每个节点按自身 nodeId 生成 partition，完全隔离
 * - 共享：引用某个全局身份 id，多个节点共享同一 partition
 */
export type IdentityMode = 'isolated' | 'shared'

/**
 * 根据 nodeId / identityId 生成 Electron partition 字符串。
 * 命名规则统一，全项目只此一处生成 partition。
 */
export function makePartition(mode: IdentityMode, key: string): string {
  // partition 只接受 alphanum / - / _ / :，key 通常是 uuid 风格，安全
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  return mode === 'isolated'
    ? `persist:canvasdesk-node-${safeKey}`
    : `persist:canvasdesk-identity-${safeKey}`
}

/** 一段可执行的用户自定义脚本——detailPanel 里 CRUD，render.vue 里渲染成按钮 */
export interface ScriptItem {
  /** 稳定 id（uuid 风格） */
  id: string
  /** 按钮上显示的短标签 */
  name: string
  /** 在 webview 页面上下文执行的 JS 代码 */
  code: string
}

/**
 * 浏览器节点：内嵌 Electron <webview> 在画布上实时浏览网页。
 *
 * URL 支持 $1 $2 … 占位符（同 CrawlerNode / HttpRequestNode），
 * 动态输入端口注入后自动替换。
 *
 * V1 特性：地址栏 + webview + 前进/后退/刷新 + 浏览模式切换。
 * V2 预留：截图输出、独立 partition、executeJavaScript 方法端口。
 */
export class BrowserNode extends Node {
  static readonly TYPE = 'browser'
  readonly type = BrowserNode.TYPE

  // —— 固定输入端口 ——

  /**
   * 本地 HTML 输入端口：接收 HtmlFileValue，渲染成 data:text/html;... 本地页面。
   * 和下面的 $1 $2 ... 字符串端口**完全独立**，互不干扰。
   * 一旦这个端口有 HtmlFileValue，BrowserNode 就走"本地渲染"模式，忽略 homeUrl。
   */
  readonly htmlInput = new InputPort('html', {
    accepts: [HtmlFileValue],
    label: {
      zh: '本地 HTML',
      en: 'Local HTML',
      ja: 'ローカル HTML',
      ko: '로컬 HTML',
      es: 'HTML local',
      ar: 'HTML محلي',
      fr: 'HTML local',
      pt: 'HTML local',
      ru: 'Локальный HTML',
      hi: 'स्थानीय HTML',
      id: 'HTML Lokal',
      de: 'Lokales HTML',
      vi: 'HTML cục bộ',
      tr: 'Yerel HTML',
      it: 'HTML locale'
    }
  })

  // —— 输出端口 ——

  /** 输出端口：当前页面 URL（每次导航更新） */
  readonly currentUrlOutput = new OutputPort('currentUrl', StringValue, {
    zh: '当前 URL',
    en: 'Current URL',
    ja: '現在の URL',
    ko: '현재 URL',
    es: 'URL actual',
    ar: 'عنوان URL الحالي',
    fr: 'URL actuelle',
    pt: 'URL atual',
    ru: 'Текущий URL',
    hi: 'वर्तमान URL',
    id: 'URL Saat Ini',
    de: 'Aktuelle URL',
    vi: 'URL hiện tại',
    tr: 'Mevcut URL',
    it: 'URL corrente'
  })

  /** 输出端口：当前页面标题（每次 title 更新） */
  readonly titleOutput = new OutputPort('title', StringValue, {
    zh: '页面标题',
    en: 'Page Title',
    ja: 'ページタイトル',
    ko: '페이지 제목',
    es: 'Título de página',
    ar: 'عنوان الصفحة',
    fr: 'Titre de la page',
    pt: 'Título da página',
    ru: 'Название страницы',
    hi: 'पृष्ठ शीर्षक',
    id: 'Judul Halaman',
    de: 'Seitentitel',
    vi: 'Tiêu đề trang',
    tr: 'Sayfa Başlığı',
    it: 'Titolo pagina'
  })

  /** 输出端口：视频录制文件（每次录像停止时 commit 新的 VideoFileValue） */
  readonly videoOutput = new OutputPort('video', VideoFileValue, {
    zh: '录制视频',
    en: 'Recorded Video',
    ja: '録画ビデオ',
    ko: '녹화 영상',
    es: 'Video grabado',
    ar: 'فيديو مسجل',
    fr: 'Vidéo enregistrée',
    pt: 'Vídeo gravado',
    ru: 'Записанное видео',
    hi: 'रिकॉर्ड किया गया वीडियो',
    id: 'Video Terekam',
    de: 'Aufgenommenes Video',
    vi: 'Video đã quay',
    tr: 'Kaydedilen Video',
    it: 'Video registrato'
  })

  // —— 方法端口 ——

  /** 方法端口：上游 commit 任意值即触发一次导航到当前 resolvedUrl */
  readonly navigatePort = new MethodPort('navigate', {
    label: {
      zh: '导航',
      en: 'Navigate',
      ja: 'ナビゲート',
      ko: '탐색',
      es: 'Navegar',
      ar: 'انتقال',
      fr: 'Naviguer',
      pt: 'Navegar',
      ru: 'Перейти',
      hi: 'नेविगेट',
      id: 'Navigasi',
      de: 'Navigieren',
      vi: 'Điều hướng',
      tr: 'Gezin',
      it: 'Naviga'
    }
  })

  // —— 持久化字段 ——

  /** 起始 URL 模板（含 $N 占位符） */
  private homeUrl = ''

  /** 输入端口 id 自增序号 */
  private portSeq = 0

  /** 页面缩放因子：1.0 = 100%，范围 0.25 ~ 5.0 */
  private zoomFactor = 1.0

  /** 用户自定义脚本（执行按钮） */
  private scripts: ScriptItem[] = []

  /**
   * 浏览器身份引用：
   * - undefined → 独立模式，partition 按 nodeId 生成
   * - string → 共享该全局身份 id，partition 按 identityId 生成
   */
  private identityId: string | undefined = undefined

  // —— 运行时派生状态（不持久化，由 render.vue 驱动更新） ——

  /** 按模板 + 当前输入值生成的最终 URL */
  private resolvedUrl = ''

  /** webview 当前真实 URL（浏览器地址栏显示的那个，可能被重定向过） */
  private currentUrl = ''

  /** 页面标题 */
  private currentTitle = ''

  /** 运行时状态 */
  private status: BrowserStatus = 'idle'

  /** 能否前进 / 后退（webview navigationEntry 变时更新） */
  private canGoBack = false
  private canGoForward = false

  /** 最近一次错误信息（webview did-fail-load 时设置） */
  private lastError = ''

  /**
   * 本地 HTML 源（data:text/html;charset=utf-8 形式）。
   * 当输入端口收到 HtmlFileValue 时异步读取并编码到此字段，render.vue 检测到非空时用 loadURL 渲染。
   * 收到 StringValue 时自动清空，回退到 URL 导航模式。
   * 不持久化（因为 HtmlFileValue 是运行时通过端口传进来的）。
   */
  private htmlSource = ''

  constructor(id: string) {
    super(id)
    this.addOutput(this.currentUrlOutput)
    this.addOutput(this.titleOutput)
    this.addOutput(this.videoOutput)
    this.addMethod(this.navigatePort)
    this.navigatePort.onTrigger(() => { void this._dispatchNavigate() })

    // 注册固定输入端口（独立于 $1/$2/... 字符串端口）
    this.addInput(this.htmlInput)

    // 默认给一个字符串输入端口，方便直接开用
    this.addInputPort()

    // 默认 box：540 × 400，webview 内容区需要足够空间
    this.setBox(540, 400)
  }

  // —— 文件拖拽（不接收） ——

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不处理
  }

  // —— 渲染层读的状态 ——

  /** URL 模板原文 */
  get displayHomeUrl(): string {
    return this.homeUrl
  }

  /**
   * 本地 HTML data URL（非空时 render.vue 应优先用 webview.loadURL 加载）。
   * 空字符串表示走正常 URL 导航。
   */
  get displayHtmlSource(): string {
    return this.htmlSource
  }

  /**
   * 当前使用的 Electron partition 字符串。
   * render.vue 用此值绑定 <webview :partition>。
   * identityId 未设置 → 按 nodeId 独立隔离；否则按 identityId 共享。
   */
  get partition(): string {
    if (this.identityId) {
      return makePartition('shared', this.identityId)
    }
    return makePartition('isolated', this.id)
  }

  /** 当前身份引用：undefined = 独立，string = 共享该全局身份 */
  get currentIdentityId(): string | undefined {
    return this.identityId
  }

  /**
   * 切换身份：传入 undefined → 独立模式；传入字符串 → 共享该身份。
   * 调用后 render.vue 应重建 webview 以让新 partition 生效。
   */
  setIdentity(id: string | undefined): void {
    if (id === this.identityId) return
    this.identityId = id
    this.notifyChanged()
  }

  /** 模板解析后的最终 URL（输入端口值 + 模板替换结果） */
  get displayResolvedUrl(): string {
    return this.resolvedUrl
  }

  /** webview 当前真实 URL */
  get displayCurrentUrl(): string {
    return this.currentUrl
  }

  /** 当前页面标题 */
  get displayTitle(): string {
    return this.currentTitle
  }

  /** 运行时状态 */
  get displayStatus(): BrowserStatus {
    return this.status
  }

  get displayCanGoBack(): boolean {
    return this.canGoBack
  }

  get displayCanGoForward(): boolean {
    return this.canGoForward
  }

  get displayLastError(): string {
    return this.lastError
  }

  get inputCount(): number {
    return this.inputPorts.length
  }

  /** 当前页面缩放因子（0.25 ~ 5.0） */
  get currentZoomFactor(): number {
    return this.zoomFactor
  }

  /** 设置缩放因子并持久化；render.vue 监听 onChanged 后调 webview.setZoomFactor() */
  setZoomFactor(factor: number): void {
    const clamped = Math.min(5.0, Math.max(0.25, Math.round(factor * 100) / 100))
    if (clamped === this.zoomFactor) return
    this.zoomFactor = clamped
    this.notifyChanged()
  }

  // —— 视频录制状态（运行时，不持久化） ——

  /** 是否正在录制（运行时状态，不持久化；render.vue 在主进程成功启动/停止后调这里同步） */
  private recording: boolean = false

  /** 录制开始的时间戳（毫秒，用于 UI 显示时长） */
  private recordingStartedAt: number = 0

  get isRecording(): boolean {
    return this.recording
  }

  get recordingStartTimestamp(): number {
    return this.recordingStartedAt
  }

  /** render.vue 在主进程成功 startRecord 后调用——纯状态变更，不碰录制逻辑 */
  markRecordingStarted(): void {
    if (this.recording) return
    this.recording = true
    this.recordingStartedAt = Date.now()
    this.notifyChanged()
  }

  /** render.vue 在主进程成功 stopRecord 后调用——纯状态变更，不碰录制逻辑 */
  markRecordingStopped(): void {
    if (!this.recording) return
    this.recording = false
    this.recordingStartedAt = 0
    this.notifyChanged()
  }

  // —— 用户脚本 CRUD ——

  /** 当前脚本列表（返回浅拷贝，避免外部直接改内部数组） */
  getScripts(): ScriptItem[] {
    return this.scripts.map((s) => ({ ...s }))
  }

  /** 新增一段脚本。返回新 id。 */
  addScript(name: string, code: string): string {
    const trimmedName = name.trim().slice(0, 24) || '未命名'
    const trimmedCode = code.trim().slice(0, MAX_SCRIPT_LEN)
    const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
    this.scripts.push({ id, name: trimmedName, code: trimmedCode })
    this.notifyChanged()
    return id
  }

  /** 更新脚本（name / code 可只传一个） */
  updateScript(id: string, patch: Partial<Pick<ScriptItem, 'name' | 'code'>>): void {
    const target = this.scripts.find((s) => s.id === id)
    if (!target) return
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim().slice(0, 24) || '未命名'
      if (trimmed === target.name) { /* skip */ } else { target.name = trimmed }
    }
    if (patch.code !== undefined) {
      const trimmed = patch.code.slice(0, MAX_SCRIPT_LEN)
      if (trimmed === target.code) { /* skip */ } else { target.code = trimmed }
    }
    this.notifyChanged()
  }

  /** 删除脚本 */
  deleteScript(id: string): void {
    const before = this.scripts.length
    this.scripts = this.scripts.filter((s) => s.id !== id)
    if (this.scripts.length !== before) this.notifyChanged()
  }

  // —— 用户操作 ——

  /** 设置 URL 模板（持久化），模板变更 → 重算 resolvedUrl 并通知 UI */
  setHomeUrl(text: string): void {
    // strip 首尾反引号 / 引号（含中文引号、智能引号等 Unicode 变体），
    // 避免用户从 Markdown、聊天窗口里复制粘贴进来带多余字符
    const quoteChars = '`"\'“”‘’「」『』《》〈〉'
    const reStrip = new RegExp(`^[\\s${quoteChars}]+|[\\s${quoteChars}]+$`, 'g')
    let trimmed = text.trim().replace(reStrip, '').slice(0, MAX_URL_LEN)
    // 自动补协议：用户输入 "google.com" → "https://google.com"
    trimmed = this.autoPrependScheme(trimmed)
    if (trimmed === this.homeUrl) return
    this.homeUrl = trimmed
    this.recomputeResolvedUrl()
    this.notifyChanged()
  }

  /** 极简协议补全：空串返回空；已有 http(s):// 不动；看起来像域名的补 https:// */
  private autoPrependScheme(url: string): string {
    if (!url) return ''
    const lower = url.toLowerCase()
    if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('$')) {
      return url
    }
    // 包含占位符（$1 $2）也不动——用户可能写了 https://$1.baidu.com
    if (/\$\d/.test(url)) return url
    // 看起来像域名或 IPv4（包含至少一个点号）
    if (/^[\w.-]+\.[\w.-]+/.test(url)) {
      return `https://${url}`
    }
    return url
  }

  /** 追加一个字符串输入端口（只接 StringValue，用于 $1 $2 占位符） */
  addInputPort(): void {
    this.portSeq += 1
    const port = new InputPort(`p${this.portSeq}`, {
      accepts: [StringValue],
      label: { zh: `$${this._stringPortCount() + 1}`, en: `$${this._stringPortCount() + 1}` }
    })
    this.addInput(port)
    this.recomputeResolvedUrl()
  }

  /** $1 $2 ... 端口数量（排除固定端口 html） */
  private _stringPortCount(): number {
    return this.inputPorts.filter((p) => p.id.startsWith('p')).length
  }

  /** 移除末尾字符串输入端口；至少保留 1 个 */
  removeLastInputPort(): void {
    const stringPorts = this.inputPorts.filter((p) => p.id.startsWith('p'))
    if (stringPorts.length <= 1) return
    const last = stringPorts[stringPorts.length - 1]
    if (!last) return
    this.removeInput(last)
    this.recomputeResolvedUrl()
    this.notifyChanged()
  }

  /**
   * 输入端口值变化：
   * - 是 htmlInput → 异步读取 HtmlFileValue → 设置 htmlSource → 本地渲染模式
   * - 是 $1/$2 字符串端口 → 重算 resolvedUrl（URL 导航模式）
   * 两个分支独立，互不干扰。
   */
  inputPortReceiveValue(ports: InputPort[]): void {
    // eslint-disable-next-line no-console
    console.log('[BrowserNode:inputPortReceiveValue] ★ 收到，ports=', ports.map((p) => p.id),
      'htmlInput.id=', this.htmlInput.id, 'includes=', ports.includes(this.htmlInput))

    if (this.allPortsFull()) {
      this.addInputPort()
    }

    // 如果是 htmlInput 触发的 → 走本地 HTML 渲染分支
    if (ports.includes(this.htmlInput)) {
      // eslint-disable-next-line no-console
      console.log('[BrowserNode:inputPortReceiveValue] → 走 htmlInput 分支')
      void this._checkHtmlSource()
      return
    }

    // 否则是 $1/$2 ... 字符串端口 → 走 URL 导航分支
    // eslint-disable-next-line no-console
    console.log('[BrowserNode:inputPortReceiveValue] → 走 URL 分支')
    this.recomputeResolvedUrl()
    this.notifyChanged()
  }

  /**
   * 处理 htmlInput 的值变化：
   * - 有 HtmlFileValue → file.text() → encodeURIComponent → htmlSource = data:text/html;...
   * - 无值 → htmlSource = '' → 回退 URL 导航
   */
  private async _checkHtmlSource(): Promise<void> {
    const [v] = this.htmlInput.value
    // eslint-disable-next-line no-console
    console.log('[BrowserNode:_checkHtmlSource] ★ htmlInput.value[0]=',
      v ? `${v.constructor.name} (${v.isNull ? 'null' : 'has value'})` : 'undefined',
      'htmlSource 当前长度=', this.htmlSource.length)

    const htmlFile = v instanceof HtmlFileValue ? v : null
    // eslint-disable-next-line no-console
    console.log('[BrowserNode:_checkHtmlSource] → instanceof HtmlFileValue?', !!htmlFile,
      'file?', htmlFile?.file ? `size=${htmlFile.file.size}` : 'no file')

    if (htmlFile && htmlFile.file) {
      try {
        const htmlText = await htmlFile.file.text()
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlText)}`
        // eslint-disable-next-line no-console
        console.log('[BrowserNode:_checkHtmlSource] ✅ file.text() 成功，HTML 长度=', htmlText.length,
          '→ dataUrl 长度=', dataUrl.length,
          '和当前 htmlSource 相同?', this.htmlSource === dataUrl)
        if (this.htmlSource !== dataUrl) {
          this.htmlSource = dataUrl
          // eslint-disable-next-line no-console
          console.log('[BrowserNode:_checkHtmlSource] htmlSource 已更新')
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[BrowserNode:_checkHtmlSource] ❌ 读取 HtmlFileValue 失败:', err)
        this.lastError = err instanceof Error ? err.message : String(err)
      }
    } else {
      if (this.htmlSource !== '') {
        this.htmlSource = ''
        // eslint-disable-next-line no-console
        console.log('[BrowserNode:_checkHtmlSource] htmlSource 清空 → 回退 URL 导航')
      }
      this.recomputeResolvedUrl()
    }
    // eslint-disable-next-line no-console
    console.log('[BrowserNode:_checkHtmlSource] → notifyChanged()')
    this.notifyChanged()
  }

  // —— render.vue 驱动的 webview 事件回调 ——

  /** webview 开始加载 → 更新状态 */
  onWebviewStartLoading(): void {
    this.status = 'loading'
    this.lastError = ''
    this.notifyChanged()
  }

  /** webview 加载完成（did-stop-loading）→ 更新状态 + 前进/后退 */
  onWebviewStopLoading(): void {
    this.status = 'ready'
    this.lastError = ''
    this.notifyChanged()
  }

  /** webview 导航成功 → 更新 currentUrl + commit 输出端口 + 前进/后退 */
  onWebviewNavigate(url: string, canGoBack: boolean, canGoForward: boolean): void {
    this.currentUrl = url
    this.canGoBack = canGoBack
    this.canGoForward = canGoForward
    this.lastError = ''
    this.status = 'ready'

    // commit 输出端口
    this.currentUrlOutput.commit(new StringValue(url))
    this.notifyChanged()
  }

  /** webview 标题更新 → 更新 title + commit 输出端口 */
  onWebviewTitle(title: string): void {
    this.currentTitle = title
    this.titleOutput.commit(new StringValue(title))
    this.notifyChanged()
  }

  /** webview 加载失败 → 更新状态 */
  onWebviewFailLoading(error: string): void {
    this.status = 'error'
    this.lastError = error
    this.notifyChanged()
  }

  // —— 内部：MethodPort navigate 触发后的导航请求派发 ——

  /**
   * MethodPort navigate 触发 → render.vue 应监听节点 onChanged + displayResolvedUrl 变化，
   * 发现 navigateRequested 变号后调 webview.loadURL。
   *
   * 为了让 render.vue 能精确知道"这次是 navigate 触发的"而非其他 notifyChanged，
   * 这里额外暴露一个递增序号。render.vue 比对序号是否变化即可。
   */
  private navigateRequestSeq = 0

  /** MethodPort 触发导航请求 */
  private async _dispatchNavigate(): Promise<void> {
    this.navigateRequestSeq += 1
    this.notifyChanged()
  }

  /** render.vue 调用此 getter 拿到序号，与上次比较判断是否需要 loadURL */
  consumeNavigateRequestSeq(): number {
    return this.navigateRequestSeq
  }

  // —— 内部工具 ——

  /** 是否所有输入端口都已被连边占用 */
  private allPortsFull(): boolean {
    if (this.inputPorts.length === 0) return false
    return this.inputPorts.every((p) => p.incomingEdgeCount > 0)
  }

  /** 把模板里的 $1 $2 $3 … 按输入端口当前值替换掉；$$ 转义为字面 $。URL 和自定义脚本共用 */
  replacePlaceholders(text: string): string {
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
  private recomputeResolvedUrl(): void {
    this.resolvedUrl = this.replacePlaceholders(this.homeUrl)
  }

  /** 校验 URL 是否看起来像个网址（极简版，render.vue 里地址栏也会调） */
  isValidUrl(url: string): boolean {
    if (url.trim().length < MIN_URL_LEN) return false
    const lower = url.trim().toLowerCase()
    if (lower.startsWith('http://') || lower.startsWith('https://')) return true
    return false
  }

  // —— 持久化 ——

  getSaveDataByState(): Record<string, unknown> {
    return {
      ...super.getSaveDataByState(),
      homeUrl: this.homeUrl,
      inputCount: this.inputPorts.length,
      zoomFactor: this.zoomFactor,
      scripts: this.scripts,
      identityId: this.identityId
    }
  }

  initStateBySaveData(state: Record<string, unknown>): void {
    super.initStateBySaveData(state)

    if (typeof state.homeUrl === 'string') {
      this.homeUrl = state.homeUrl.slice(0, MAX_URL_LEN)
    }

    if (typeof state.zoomFactor === 'number') {
      this.zoomFactor = Math.min(5.0, Math.max(0.25, Math.round(state.zoomFactor * 100) / 100))
    }

    // identityId：string 保留，undefined/空串 → 独立模式
    if (typeof state.identityId === 'string' && state.identityId.trim()) {
      this.identityId = state.identityId.trim()
    } else {
      this.identityId = undefined
    }

    if (Array.isArray(state.scripts)) {
      this.scripts = state.scripts
        .filter((s: any) => s && typeof s.id === 'string' && typeof s.code === 'string')
        .map((s: any) => ({
          id: s.id,
          name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 24) : '未命名',
          code: String(s.code).slice(0, MAX_SCRIPT_LEN)
        }))
    }

    // 重建端口
    const wanted = typeof state.inputCount === 'number'
      ? Math.max(1, Math.floor(state.inputCount))
      : this.inputPorts.length
    while (this.inputPorts.length > 0) {
      const p = this.inputPorts[this.inputPorts.length - 1]!
      this.removeInput(p)
    }
    for (let i = 0; i < wanted; i += 1) {
      this.addInputPort()
    }

    this.recomputeResolvedUrl()
    this.notifyChanged()
  }
}
