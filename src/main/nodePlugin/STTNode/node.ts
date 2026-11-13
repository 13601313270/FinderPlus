import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { StringValue } from '../../engine/data/StringValue'
import { base64ToBytes, bytesToBase64 } from '../../engine/data/base64'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { inferAudioMime } from '../AudioFileNode/mime'
import {
  STT_PROVIDERS,
  getDefaultSttModel,
  getSttModelIdsByProvider,
  isSttMaasModel,
  resolveSttEndpoint,
  type SttProviderId
} from './providers'

type SttStatus = 'idle' | 'loading' | 'done' | 'error'

interface AudioSource {
  file: File
  base64: string
  mime: string
  name: string
}

/**
 * 语音提取文字节点：
 * 音频输入（上游音频文件 / 本地选文件）→ 调用各家的语音识别 API → 输出文本。
 *
 * 支持两种请求协议，见 providers.ts：
 *  - openai-multipart：硅基流动 / OpenAI / 智谱，multipart 直接传文件
 *  - dashscope-json：阿里云百炼 / Token Plan，JSON 里传 Base64 Data URI
 */
export class STTNode extends Node {
  static readonly TYPE = 'speech-to-text'
  readonly type = STTNode.TYPE

  // —— 端口 ——

  /** 输入端口：待识别音频。未接线时用本地选择的音频。 */
  readonly audioInput = new InputPort('audio', {
    accepts: [AudioFileValue],
    label: {
      zh: '音频',
      en: 'Audio',
      ja: '音声',
      ko: '오디오',
      es: 'Audio',
      ar: 'صوت',
      fr: 'Audio',
      pt: 'Áudio',
      ru: 'Аудио',
      hi: 'ऑडियो',
      id: 'Audio',
      de: 'Audio',
      vi: 'Âm thanh',
      tr: 'Ses',
      it: 'Audio'
    }
  })

  /** 输出端口：识别出的文本 */
  readonly textOutput = new OutputPort('text', StringValue, {
    zh: '文本',
    en: 'Text',
    ja: 'テキスト',
    ko: '텍스트',
    es: 'Texto',
    ar: 'نص',
    fr: 'Texte',
    pt: 'Texto',
    ru: 'Текст',
    hi: 'पाठ',
    id: 'Teks',
    de: 'Text',
    vi: 'Văn bản',
    tr: 'Metin',
    it: 'Testo'
  })

  /** 输出端口：失败原因 */
  readonly errorOutput = new OutputPort('error', StringValue, {
    zh: '错误信息',
    en: 'Error',
    ja: 'エラー',
    ko: '오류',
    es: 'Error',
    ar: 'خطأ',
    fr: 'Erreur',
    pt: 'Erro',
    ru: 'Ошибка',
    hi: 'त्रुटि',
    id: 'Kesalahan',
    de: 'Fehler',
    vi: 'Lỗi',
    tr: 'Hata',
    it: 'Errore'
  })

  /** 方法端口：外部触发一次识别 */
  readonly generateMethod = new MethodPort('generate', {
    label: {
      zh: '触发识别',
      en: 'Trigger Transcription',
      ja: '認識実行',
      ko: '인식 트리거',
      es: 'Activar transcripción',
      ar: 'تشغيل النسخ',
      fr: 'Déclencher la transcription',
      pt: 'Acionar transcrição',
      ru: 'Запустить распознавание',
      hi: 'ट्रांसक्रिप्शन ट्रिगर',
      id: 'Picu Transkripsi',
      de: 'Transkription auslösen',
      vi: 'Kích hoạt nhận dạng',
      tr: 'Yazıya çevirmeyi tetikle',
      it: 'Attiva trascrizione'
    }
  })

  // —— 节点级配置 ——

  private provider: SttProviderId = 'siliconflow'
  private model: string = getDefaultSttModel('siliconflow')
  private workspaceId = ''
  private language = 'auto'

  /** 本地音频（audioInput 未接线时用） */
  private localAudioBase64 = ''
  private localAudioName = ''

  /** 收到新音频时是否自动识别 */
  private autoGenerate = false

  // —— 运行态 ——

  private status: SttStatus = 'idle'
  private errorMessage = ''
  private resultText = ''

  private requestId = 0
  private abortController: AbortController | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.audioInput)
    this.addOutput(this.textOutput)
    this.addOutput(this.errorOutput)
    this.addMethod(this.generateMethod)
    this.generateMethod.onTrigger(() => this.manualTrigger())
    this.setBox(250, 230)
  }

  // —— UI 读写 ——

  get displayProvider(): SttProviderId { return this.provider }
  setProvider(v: SttProviderId): void {
    if (this.provider === v) return
    this.provider = v
    const ids = getSttModelIdsByProvider(v)
    if (!ids.includes(this.model)) this.model = ids[0] ?? ''
    this.notifyChanged()
  }

  get displayModel(): string { return this.model }
  setModel(v: string): void {
    if (!getSttModelIdsByProvider(this.provider).includes(v)) return
    if (this.model === v) return
    this.model = v
    this.notifyChanged()
  }

  get availableModels(): readonly string[] {
    return getSttModelIdsByProvider(this.provider)
  }

  get displayWorkspaceId(): string { return this.workspaceId }
  setWorkspaceId(v: string): void {
    const trimmed = v.trim()
    if (this.workspaceId === trimmed) return
    this.workspaceId = trimmed
    this.notifyChanged()
  }

  get displayLanguage(): string { return this.language }
  setLanguage(v: string): void {
    if (this.language === v) return
    this.language = v
    this.notifyChanged()
  }

  get displayAutoGenerate(): boolean { return this.autoGenerate }
  setAutoGenerate(v: boolean): void {
    if (this.autoGenerate === v) return
    this.autoGenerate = v
    this.notifyChanged()
  }

  get displayStatus(): SttStatus { return this.status }
  get displayError(): string { return this.errorMessage }
  get displayResult(): string { return this.resultText }

  get audioConnected(): boolean {
    return this.audioInput.incomingEdgeCount > 0
  }

  /** 上游音频文件名（接线时）；未接线返回 undefined */
  get upstreamAudioName(): string | undefined {
    const [first] = this.audioInput.value
    if (first instanceof AudioFileValue) return first.file?.name
    return undefined
  }

  get displayLocalAudioName(): string { return this.localAudioName }
  setLocalAudio(base64: string, name: string): void {
    this.localAudioBase64 = base64
    this.localAudioName = name
    this.notifyChanged()
  }
  clearLocalAudio(): void {
    this.localAudioBase64 = ''
    this.localAudioName = ''
    this.notifyChanged()
  }

  get hasAudioSource(): boolean {
    return this.audioConnected || this.localAudioBase64.length > 0
  }

  get hasProviderKey(): boolean {
    return resolveSttEndpoint(this.provider, this.model, this.workspaceId).key.length > 0
  }

  /** 百炼的 qwen-audio-3.x-asr-flash 走 MAAS 专属域名，必须填 Workspace ID */
  get requiresWorkspace(): boolean {
    return isSttMaasModel(this.provider, this.model)
  }

  get hasWorkspace(): boolean {
    return !this.requiresWorkspace || this.workspaceId.length > 0
  }

  get canRun(): boolean {
    return this.hasProviderKey && this.hasWorkspace
  }

  // —— 触发识别 ——

  manualTrigger(): void {
    if (this.status === 'loading') return
    void this.transcribe()
  }

  cancel(): void {
    this.requestId++
    this.abortController?.abort()
    this.abortController = null
    if (this.status === 'loading') {
      this.status = 'idle'
      this.errorMessage = ''
      this.failRun()
      this.notifyChanged()
    }
  }

  private async resolveAudio(): Promise<AudioSource | null> {
    const [first] = this.audioInput.value
    const upstream = first instanceof AudioFileValue ? first.file : undefined
    if (upstream) {
      const bytes = new Uint8Array(await upstream.arrayBuffer())
      const mime = upstream.type || inferAudioMime(upstream.name)
      return {
        file: upstream,
        base64: bytesToBase64(bytes),
        mime: mime === 'audio/*' ? 'audio/mpeg' : mime,
        name: upstream.name
      }
    }
    if (!this.localAudioBase64) return null

    const name = this.localAudioName || 'audio.wav'
    const inferred = inferAudioMime(name)
    const mime = inferred === 'audio/*' ? 'audio/mpeg' : inferred
    const bytes = base64ToBytes(this.localAudioBase64)
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    return {
      file: new File([ab], name, { type: mime }),
      base64: this.localAudioBase64,
      mime,
      name
    }
  }

  private async transcribe(): Promise<void> {
    const source = await this.resolveAudio()
    if (!source) {
      this.setError('请先选择音频文件，或从上游音频节点接线')
      return
    }

    const endpoint = resolveSttEndpoint(this.provider, this.model, this.workspaceId)
    if (!endpoint.key) {
      this.setError(`未配置「${this.providerLabel()}」的 API Key，请先在设置中填写`)
      return
    }
    if (this.requiresWorkspace && !this.workspaceId) {
      this.setError('请先填写业务空间 ID（Workspace ID）——可在百炼控制台「业务空间」页面找到')
      return
    }

    const myRequestId = ++this.requestId
    const controller = new AbortController()
    this.abortController = controller

    this.beginRun()
    this.status = 'loading'
    this.errorMessage = ''
    this.notifyChanged()

    try {
      const text = endpoint.requestFormat === 'openai-multipart'
        ? await this.requestMultipart(endpoint.url, endpoint.key, endpoint.model, source, controller.signal)
        : await this.requestDashscope(endpoint.url, endpoint.key, endpoint.model, source, controller.signal)

      if (this.requestId !== myRequestId) return

      this.resultText = text
      this.status = 'done'
      this.errorMessage = ''
      this.textOutput.commit(new StringValue(text), { force: true })
      this.errorOutput.clear()
      this.completeRun()
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        this.status = 'idle'
        this.errorMessage = ''
        this.errorOutput.clear()
      } else {
        this.status = 'error'
        this.errorMessage = (err as Error).message || String(err)
        this.errorOutput.commit(new StringValue(this.errorMessage))
        this.notifySystemError()
      }
      if (this.requestId === myRequestId) this.failRun()
    } finally {
      if (this.abortController === controller) this.abortController = null
      if (this.requestId === myRequestId) this.notifyChanged()
    }
  }

  /** OpenAI 兼容协议：multipart/form-data 直接上传音频文件 */
  private async requestMultipart(
    url: string,
    key: string,
    model: string,
    source: AudioSource,
    signal: AbortSignal
  ): Promise<string> {
    const form = new FormData()
    form.append('file', source.file, source.name)
    form.append('model', model)
    // 目前只有 OpenAI 官方文档明确支持 language 参数
    if (this.provider === 'openai' && this.language !== 'auto') {
      form.append('language', this.language)
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal
    })
    const data = await readJson(res)
    if (!res.ok) {
      throw new Error(extractErrorMessage(data) ?? `语音识别请求失败（${res.status} ${res.statusText}）`)
    }
    const text = extractText(data)
    if (!text) throw new Error('响应里没有识别文本')
    return text
  }

  /** 百炼 / Token Plan 协议：JSON 里传 Base64 Data URI */
  private async requestDashscope(
    url: string,
    key: string,
    model: string,
    source: AudioSource,
    signal: AbortSignal
  ): Promise<string> {
    const parameters: Record<string, unknown> = { format: fileExt(source.name) }
    if (this.language !== 'auto') parameters.language_hints = [this.language]

    const body = {
      model,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'input_audio',
                input_audio: { data: `data:${source.mime};base64,${source.base64}` }
              }
            ]
          }
        ]
      },
      parameters
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify(body),
      signal
    })
    const data = await readJson(res)
    if (!res.ok) {
      throw new Error(extractErrorMessage(data) ?? `语音识别请求失败（${res.status} ${res.statusText}）`)
    }
    const text = extractText(data)
    if (!text) throw new Error('响应里没有识别文本')
    return text
  }

  private providerLabel(): string {
    return {
      siliconflow: '硅基流动',
      openai: 'OpenAI',
      glm: '智谱',
      dashscope: '阿里云百炼',
      tokenplan: '千问 Token Plan'
    }[this.provider]
  }

  private setError(message: string): void {
    this.status = 'error'
    this.errorMessage = message
    this.errorOutput.commit(new StringValue(message))
    this.notifyChanged()
  }

  private notifySystemError(): void {
    const w = window as unknown as {
      notificationApi?: { show: (t: string, b?: string, m?: Record<string, unknown>) => Promise<unknown> }
      getCurrentCanvasId?: () => string
    }
    if (!w.notificationApi) return
    const canvasId = w.getCurrentCanvasId?.()
    w.notificationApi.show('语音识别失败', this.errorMessage, {
      ...(canvasId ? { canvasId } : {}),
      nodeId: this.id
    }).catch(() => { /* noop */ })
  }

  // —— 文件拖入 ——

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean { return false }
  onFileDrop(_sourcePath: string): void { /* 不处理 */ }

  // —— 端口变化 ——

  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    this.notifyChanged()
    if (this.autoGenerate && this.status !== 'loading' && this.hasAudioSource) {
      this.manualTrigger()
    }
  }

  // —— 持久化 ——

  getSaveDataByState(): Record<string, unknown> {
    return {
      ...super.getSaveDataByState(),
      provider: this.provider,
      model: this.model,
      workspaceId: this.workspaceId,
      language: this.language,
      autoGenerate: this.autoGenerate
    }
  }

  initStateBySaveData(state: Record<string, unknown>): void {
    super.initStateBySaveData(state)

    const provider = state.provider as SttProviderId | undefined
    if (provider && provider in STT_PROVIDERS) this.provider = provider

    const model = state.model as string | undefined
    const ids = getSttModelIdsByProvider(this.provider)
    this.model = model && ids.includes(model) ? model : (ids[0] ?? '')

    if (typeof state.workspaceId === 'string') this.workspaceId = state.workspaceId.trim()
    if (typeof state.language === 'string') this.language = state.language
    if (typeof state.autoGenerate === 'boolean') this.autoGenerate = state.autoGenerate
  }

  beforeDestroy(): void {
    this.cancel()
    super.beforeDestroy()
  }
}

// —— 内部辅助 ——

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** 兼容 OpenAI { text } 与百炼 { output: { text } } */
function extractText(data: Record<string, unknown>): string {
  if (typeof data.text === 'string') return data.text.trim()
  const output = data.output
  if (output && typeof output === 'object') {
    const text = (output as Record<string, unknown>).text
    if (typeof text === 'string') return text.trim()
  }
  return ''
}

function extractErrorMessage(data: Record<string, unknown>): string | undefined {
  const error = data.error
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message
    if (typeof message === 'string' && message) return message
  }
  if (typeof data.message === 'string' && data.message) return data.message
  return undefined
}

/** 文件名后缀（小写、无点）；拿不到时兜底 wav */
function fileExt(name: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name)
  return match ? match[1].toLowerCase() : 'wav'
}
