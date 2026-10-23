import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { bytesToBase64 } from '../../engine/data/base64'
import { readImageProviderKey } from '../ImageGenNode/providers'
import {
  resolveTtsEndpoint,
  getTtsModelIdsByProvider,
  getDefaultTtsModel,
  TTS_LANGUAGE_TYPES,
  TTS_SAMPLE_RATES,
  DEFAULT_SAMPLE_RATE,
  isMaasModel,
  isTokenPlanModel,
  supportsReferenceAudio,
  TTS_MODELS,
  type TtsProviderId,
  type TtsModelId,
  type TtsLanguageType,
  type TtsSampleRate,
} from './providers'

type TtsStatus = 'idle' | 'loading' | 'done' | 'error'

export class TTSNode extends Node {
  static readonly TYPE = 'tts-gen'
  readonly type = TTSNode.TYPE

  // —— 端口 ——

  /** 输入端口：待合成文本。未接线时用本地 textarea 值。 */
  readonly textInput = new InputPort('text', {
    accepts: [StringValue],
    label: {
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
    }
  })

  /** 输入端口：参考音频（音色克隆，仅 qwen-audio-3.1-tts-next 有效） */
  readonly referenceAudioInput = new InputPort('reference_audio', {
    accepts: [AudioFileValue],
    label: {
      zh: '参考音频',
      en: 'Reference Audio',
      ja: '参照音声',
      ko: '참조 오디오',
      es: 'Audio de referencia',
      ar: 'الصوت المرجعي',
      fr: 'Audio de référence',
      pt: 'Áudio de referência',
      ru: 'Опорный аудио',
      hi: 'संदर्भ ऑडियो',
      id: 'Audio Referensi',
      de: 'Referenz-Audio',
      vi: 'Âm thanh tham chiếu',
      tr: 'Referans Ses',
      it: 'Audio di riferimento'
    }
  })

  /** 输出端口：合成后的音频文件 */
  readonly audioOutput = new OutputPort('audio', AudioFileValue, {
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
  })

  /** 输出端口：音频时长（秒） */
  readonly durationOutput = new OutputPort('duration', NumberValue, {
    zh: '时长（秒）',
    en: 'Duration (s)',
    ja: '長さ（秒）',
    ko: '길이 (초)',
    es: 'Duración (s)',
    ar: 'المدة (ث)',
    fr: 'Durée (s)',
    pt: 'Duração (s)',
    ru: 'Длительность (с)',
    hi: 'अवधि (स)',
    id: 'Durasi (dtk)',
    de: 'Dauer (s)',
    vi: 'Thời lượng (s)',
    tr: 'Süre (s)',
    it: 'Durata (s)'
  })

  /** 输出端口：失败原因（API 出错时 commit 错误字符串；成功时 clear） */
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

  /** 方法端口：外部触发一次合成 */
  readonly generateMethod = new MethodPort('generate', {
    label: {
      zh: '触发生成',
      en: 'Trigger Generate',
      ja: '生成実行',
      ko: '생성 트리거',
      es: 'Activar generación',
      ar: 'تشغيل التوليد',
      fr: 'Déclencher la génération',
      pt: 'Acionar geração',
      ru: 'Запустить генерацию',
      hi: 'जनरेट ट्रिगर',
      id: 'Picu Generasi',
      de: 'Generierung auslösen',
      vi: 'Kích hoạt tạo',
      tr: 'Üretimi tetikle',
      it: 'Attiva generazione'
    }
  })

  // —— 节点级配置 ——

  private provider: TtsProviderId = 'dashscope'
  private model: TtsModelId = getDefaultTtsModel('dashscope')
  private voice = 'Cherry'
  private languageType: TtsLanguageType = 'Chinese'
  private instructions = '' // 仅 qwen3-tts-instruct-flash 有效
  private workspaceId = '' // 仅 MAAS 端点有效：业务空间 ID
  private sampleRate: TtsSampleRate = DEFAULT_SAMPLE_RATE // MAAS 端点的输出采样率

  /** 本地缓存文本（textInput 未接线时用这个） */
  private localText = ''
  /** 本地参考音频 base64（referenceAudioInput 未接线时用这个） */
  private localReferenceAudioBase64 = ''

  // —— 运行态 ——

  private status: TtsStatus = 'idle'
  private errorMessage = ''
  private resultFile: File | null = null
  private resultHash = ''

  /** stale-call 保护：每次请求递增，响应回来时比一下 */
  private requestId = 0
  private abortController: AbortController | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.textInput)
    this.addInput(this.referenceAudioInput)
    this.addOutput(this.audioOutput)
    this.addOutput(this.durationOutput)
    this.addOutput(this.errorOutput)
    this.addMethod(this.generateMethod)
    this.generateMethod.onTrigger(() => this.manualTrigger())
    this.setBox(240, 240)
  }

  // —— UI 读写 ——

  get displayProvider(): TtsProviderId { return this.provider }
  setProvider(v: TtsProviderId): void {
    if (this.provider === v) return
    this.provider = v
    // 切 provider 时模型要落到新 provider 支持的范围内
    const valid = getTtsModelIdsByProvider(v)
    if (!valid.includes(this.model)) {
      this.model = getDefaultTtsModel(v)
    }
    this.notifyChanged()
  }

  get displayModel(): TtsModelId { return this.model }
  setModel(v: TtsModelId): void {
    const valid = getTtsModelIdsByProvider(this.provider)
    if (!valid.includes(v)) return
    if (this.model === v) return
    this.model = v
    if (v !== 'qwen3-tts-instruct-flash') this.instructions = ''
    this.notifyChanged()
  }

  get displayVoice(): string { return this.voice }
  setVoice(v: string): void {
    if (this.voice === v) return
    this.voice = v
    this.notifyChanged()
  }

  get displayLanguage(): TtsLanguageType { return this.languageType }
  setLanguage(v: TtsLanguageType): void {
    if (this.languageType === v) return
    this.languageType = v
    this.notifyChanged()
  }

  get displayInstructions(): string { return this.instructions }
  setInstructions(v: string): void {
    if (this.instructions === v) return
    this.instructions = v
    this.notifyChanged()
  }

  get displayWorkspaceId(): string { return this.workspaceId }
  setWorkspaceId(v: string): void {
    const trimmed = v.trim()
    if (this.workspaceId === trimmed) return
    this.workspaceId = trimmed
    this.notifyChanged()
  }

  get displaySampleRate(): TtsSampleRate { return this.sampleRate }
  setSampleRate(v: number): void {
    const rate = v as TtsSampleRate
    if (!TTS_SAMPLE_RATES.includes(rate)) return
    if (this.sampleRate === rate) return
    this.sampleRate = rate
    this.notifyChanged()
  }

  /** referenceAudioInput 是否已接线 */
  get referenceAudioConnected(): boolean {
    return this.referenceAudioInput.incomingEdgeCount > 0
  }

  /** referenceAudioInput 端口值（AudioFileValue | null） */
  get displayReferenceAudio(): AudioFileValue | null {
    const [first] = this.referenceAudioInput.value
    return first instanceof AudioFileValue ? first : null
  }

  setLocalReferenceAudio(base64: string): void {
    this.localReferenceAudioBase64 = base64
    this.notifyChanged()
  }

  get displayReferenceAudioBase64(): string { return this.localReferenceAudioBase64 }

  get displayText(): string {
    // 优先取 textInput 端口最新值，没接退回 localText
    const [first] = this.textInput.value
    if (first instanceof StringValue && !first.isNull && first.value?.trim()) {
      return first.value.trim()
    }
    return this.localText
  }
  setLocalText(v: string): void {
    if (this.localText === v) return
    this.localText = v
    this.notifyChanged()
  }

  get displayStatus(): TtsStatus { return this.status }
  get displayError(): string { return this.errorMessage }
  get previewFile(): File | null { return this.resultFile }
  get previewHash(): string { return this.resultHash }

  /** 当前 provider 是否配了 Key */
  get hasProviderKey(): boolean {
    const key = readImageProviderKey(this.provider)
    if (!key) return false
    // DashScope MAAS 端点还需要 WorkspaceId（Token Plan 不需要）
    if (isMaasModel(this.model)) {
      return this.workspaceId.length > 0
    }
    return true
  }

  /** 是否使用 MAAS 端点（DashScope 按量付费的 qwen-audio-3.1 系列，需要 WorkspaceId） */
  get isMaasMode(): boolean {
    return isMaasModel(this.model)
  }

  /** 是否 Token Plan 模型（SpeechSynthesizer 端点，不需要 WorkspaceId） */
  get isTokenPlanMode(): boolean {
    return isTokenPlanModel(this.model)
  }

  /** 当前模型是否支持参考音频音色克隆（仅 DashScope qwen-audio-3.1-tts-next） */
  get supportsRefAudio(): boolean {
    return supportsReferenceAudio(this.model)
  }

  /** 当前模型是否支持 instructions */
  get modelSupportsInstructions(): boolean {
    return resolveTtsEndpoint(this.provider, this.model).supportsInstructions
  }

  /** 可用音色选项 */
  get availableVoices(): readonly { id: string; label: string }[] {
    const preset = resolveTtsEndpoint(this.provider, this.model)
    const voices = preset.voices ?? []
    return voices.map(v => ({
      id: v.id,
      label: `${v.label.zh} / ${v.label.en}`
    }))
  }

  /** 可用语言选项 */
  get availableLanguages(): readonly string[] { return TTS_LANGUAGE_TYPES }

  /** 当前 provider 下可用的模型选项 */
  get availableModels(): readonly TtsModelId[] { return getTtsModelIdsByProvider(this.provider) }

  // —— 触发生成 ——

  manualTrigger(): void {
    const text = this.displayText.trim()
    if (!text) {
      this.status = 'error'
      this.errorMessage = '请输入要合成的文本'
      this.errorOutput.commit(new StringValue(this.errorMessage))
      this.notifyChanged()
      return
    }
    // DashScope MAAS 端点（qwen-audio-3.1 系列）需要 WorkspaceId；Token Plan 和旧 DashScope 端点不需要
    if (this.isMaasMode && !this.workspaceId) {
      this.status = 'error'
      this.errorMessage = '请先填写业务空间 ID（Workspace ID）——可在百炼控制台「业务空间」页面找到'
      this.errorOutput.commit(new StringValue(this.errorMessage))
      this.notifyChanged()
      return
    }
    // Token Plan 下参考音频音色克隆不可用——如果用户选了 DashScope 的 3.1-next 模型
    // 但 provider 是 tokenplan（不应该发生，因为 setModel 会过滤），
    // 或者接了参考音频端口但当前模型不支持。
    // 这里做个防御性清理：Token Plan 模型直接不读取 referenceAudio。
    this.fetchAndCommit(text)
  }

  /** 取消当前 in-flight 请求 */
  cancel(): void {
    this.requestId++ // stale-call：后续响应回来会被丢掉
    this.abortController?.abort()
    this.abortController = null
    // 直接重置状态 + 通知 UI —— 不依赖 catch/finally 里的 stale 判断
    if (this.status === 'loading') {
      this.status = 'idle'
      this.errorMessage = ''
      this.resultFile = null
      this.notifyChanged()
    }
  }

  /** 核心：发 TTS 请求 → 下载 → 落盘 → commit（支持两套 API） */
  private async fetchAndCommit(text: string): Promise<void> {
    const myRequestId = ++this.requestId
    const controller = new AbortController()
    this.abortController = controller

    this.status = 'loading'
    this.errorMessage = ''
    this.notifyChanged()

    try {
      const endpoint = resolveTtsEndpoint(this.provider, this.model, this.workspaceId)
      if (!endpoint.key) {
        const label = this.provider === 'tokenplan'
          ? '千问 Token Plan API Key 未配置。请先在设置页填写千问 Token Plan 的 API Key。'
          : '阿里云百炼 API Key 未配置。请先在设置页填写阿里云百炼的 API Key。'
        throw new Error(label)
      }

      // voice 兜底：节点里存的 voice 可能来自旧端点（如 DashScope 3.1 的 longanhuan_v3.1），
      // 切到 Token Plan 后 3.0 系列 voice 列表完全不同。校验一下，不在列表里就用默认音色。
      const availableVoiceIds = new Set((endpoint.voices ?? []).map(v => v.id))
      const effectiveVoice = (this.voice && availableVoiceIds.has(this.voice))
        ? this.voice
        : (endpoint.defaultVoice ?? this.voice)

      // —— 1. 构造请求体（根据 requestFormat 走不同分支） ——
      let bodyStr: string
      let outMime = 'audio/wav'
      let outExt = 'wav'

      if (endpoint.requestFormat === 'dashscope-sync') {
        // DashScope 旧端点 multimodal-generation：qwen3-tts-flash / qwen3-tts-instruct-flash
        const body: Record<string, unknown> = {
          model: endpoint.model,
          input: { text, voice: effectiveVoice, language_type: this.languageType }
        }
        if (endpoint.supportsInstructions && this.instructions.trim()) {
          body.input = { ...(body.input as Record<string, unknown>), instructions: this.instructions.trim() }
          body.parameters = { optimize_instructions: true }
        }
        bodyStr = JSON.stringify(body)
      } else if (endpoint.requestFormat === 'dashscope-maas') {
        // DashScope MAAS SpeechSynthesizer simple：qwen-audio-3.1-tts-flash
        const input: Record<string, unknown> = {
          text,
          voice: effectiveVoice,
          format: endpoint.defaultFormat ?? 'wav',
          sample_rate: this.sampleRate
        }
        if (endpoint.supportsInstructions && this.instructions.trim()) {
          input.instruction = this.instructions.trim()
        }
        bodyStr = JSON.stringify({ model: endpoint.model, input })
      } else if (endpoint.requestFormat === 'tokenplan-simple') {
        // Token Plan SpeechSynthesizer：qwen-audio-3.0-tts-flash / qwen-audio-3.0-tts-plus
        // 仅支持 text + voice + format + sample_rate，无 instruction 等扩展字段
        const audiogenInput: Record<string, unknown> = {
          text,
          voice: effectiveVoice,
          format: endpoint.defaultFormat ?? 'wav',
          sample_rate: this.sampleRate
        };
        // 收集参考音频：优先 referenceAudioInput 端口，fallback 本地
        const refAudios: Array<{ audio_data: string }> = []
        const portAudio = this.displayReferenceAudio
        if (portAudio?.file) {
          const refBytes = new Uint8Array(await portAudio.file.arrayBuffer())
          const refB64 = bytesToBase64(refBytes)
          const refMime = portAudio.file.type || 'audio/wav'
          refAudios.push({ audio_data: `data:${refMime};base64,${refB64}` })
        } else if (this.localReferenceAudioBase64) {
          refAudios.push({ audio_data: `data:audio/wav;base64,${this.localReferenceAudioBase64}` })
        }
        if (refAudios.length > 0) audiogenInput.references = refAudios

        bodyStr = JSON.stringify({
          model: endpoint.model,
          input: audiogenInput
        })
      } else {
        // DashScope MAAS Audiogen：qwen-audio-3.1-tts-next（支持参考音频音色克隆）
        const audiogenInput: Record<string, unknown> = {
          text_prompt: text,
          format: endpoint.defaultFormat ?? 'wav',
          sample_rate: this.sampleRate
        }

        // 收集参考音频：优先 referenceAudioInput 端口，fallback 本地
        const refAudios: Array<{ audio_data: string }> = []
        const portAudio = this.displayReferenceAudio
        if (portAudio?.file) {
          const refBytes = new Uint8Array(await portAudio.file.arrayBuffer())
          const refB64 = bytesToBase64(refBytes)
          const refMime = portAudio.file.type || 'audio/wav'
          refAudios.push({ audio_data: `data:${refMime};base64,${refB64}` })
        } else if (this.localReferenceAudioBase64) {
          refAudios.push({ audio_data: `data:audio/wav;base64,${this.localReferenceAudioBase64}` })
        }
        if (refAudios.length > 0) audiogenInput.references = refAudios

        bodyStr = JSON.stringify({ model: endpoint.model, input: audiogenInput })
      }

      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${endpoint.key}`
        },
        body: bodyStr,
        signal: controller.signal
      })

      if (this.requestId !== myRequestId) return // stale

      const data = await res.json()
      const root = data as Record<string, unknown>
      const output = root?.output as Record<string, unknown> | undefined
      if (!res.ok) {
        const msg = root?.message ?? output?.message ?? `TTS 请求失败（${res.status} ${res.statusText}）`
        throw new Error(String(msg))
      }

      if (this.requestId !== myRequestId) return // stale

      // 2. 从响应体抠 audio URL：output.audio.url
      const audio = output?.audio as Record<string, unknown> | undefined
      const audioUrl = audio?.url
      if (typeof audioUrl !== 'string' || !audioUrl) {
        throw new Error('响应里没找到音频 URL')
      }

      // 3. 下载（http → https 绕过 CSP connect-src 限制）
      const httpsUrl = audioUrl.replace(/^http:\/\//i, 'https://')
      const audioRes = await fetch(httpsUrl, { signal: controller.signal })
      if (!audioRes.ok) throw new Error(`下载音频失败（${audioRes.status} ${audioRes.statusText}）`)
      const serverContentType = audioRes.headers.get('content-type') ?? '(none)'
      console.log('[TTS] server content-type:', serverContentType, 'url:', audioUrl)
      const blob = await audioRes.blob()
      console.log('[TTS] blob.size:', blob.size, 'blob.type:', blob.type)
      const bytes = new Uint8Array(await blob.arrayBuffer())
      console.log('[TTS] bytes.length:', bytes.length, 'first 16 bytes (hex):',
        Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '))
      // 用服务端返回的实际 content-type 替代硬编码，更靠谱
      const actualMime = blob.type || serverContentType.split(';')[0].trim() || outMime
      const actualExt = mimeToExt(actualMime) ?? outExt
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      const fileName = `tts-${Date.now()}.${actualExt}`
      const file = new File([ab], fileName, { type: actualMime })
      console.log('[TTS] File created:', 'name=', fileName, 'size=', file.size, 'type=', file.type)
      const hash = djb2(bytesToBase64(bytes))

      if (this.requestId !== myRequestId) return // stale

      // 4. 落盘
      let diskName = `tts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${outExt}`
      try {
        const reader = new FileReader()
        const b64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const url = reader.result as string
            resolve(url.includes(',') ? url.split(',')[1] : url)
          }
          reader.onerror = () => reject(new Error('读取生成的音频失败'))
          reader.readAsDataURL(file)
        })
        const pureB64 = await b64Promise
        // @ts-ignore
        const written = await window.fileApi.writeBuffer(diskName, pureB64, false)
        diskName = written.fileName
      } catch {
        // 落盘失败静默忽略，内存 commit 仍能让下游拿到音频
      }

      // 5. commit
      this.audioOutput.commit(new AudioFileValue(file, hash))
      this.errorOutput.clear()
      const duration = parseWavDuration(bytes)
      console.log('[TTS] parseWavDuration result:', duration, 'format=', actualExt)
      this.resultFile = file
      this.resultHash = hash
      this.status = 'done'
      this.errorMessage = ''
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        this.status = 'idle'
        this.errorMessage = ''
        this.errorOutput.clear()
      } else {
        this.status = 'error'
        this.errorMessage = (err as Error).message || String(err)
        this.errorOutput.commit(new StringValue(this.errorMessage))
        // 系统通知（仅真实错误，用户主动取消不弹）
        const w = window as unknown as {
          notificationApi?: { show: (t: string, b?: string, m?: Record<string, unknown>) => Promise<unknown> }
          getCurrentCanvasId?: () => string
        }
        if (w.notificationApi) {
          const canvasId = w.getCurrentCanvasId?.()
          w.notificationApi.show('语音合成失败', this.errorMessage, {
            ...(canvasId ? { canvasId } : {}),
            nodeId: this.id
          }).catch(() => { /* noop */ })
        }
      }
    } finally {
      if (this.abortController === controller) this.abortController = null
      if (this.requestId === myRequestId) this.notifyChanged()
    }
  }

  // —— 文件拖入 ——

  /** 本节点不接受文件拖入 */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean { return false }
  onFileDrop(_sourcePath: string): void { /* 不处理 */ }

  // —— 端口变化 ——

  /** 只刷新 UI，不自动生成——生成按次调用，等用户点按钮 */
  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    this.notifyChanged()
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      provider: this.provider,
      model: this.model,
      voice: this.voice,
      languageType: this.languageType,
      instructions: this.instructions,
      localText: this.localText,
      workspaceId: this.workspaceId,
      sampleRate: this.sampleRate
    }
  }

  readState(state: Record<string, unknown>): void {
    // provider：有存就用存的；没有存（兼容旧数据），根据 model 反推
    const storedProvider = state.provider as TtsProviderId | undefined
    if (storedProvider === 'dashscope' || storedProvider === 'tokenplan') {
      this.provider = storedProvider
    } else {
      // 旧数据无 provider 字段：按 model 名推断
      const m = state.model as TtsModelId | undefined
      if (m && TTS_MODELS[m]?.provider === 'tokenplan') this.provider = 'tokenplan'
    }

    // model：必须属于当前 provider 的可用列表
    const m = state.model as TtsModelId | undefined
    if (m && getTtsModelIdsByProvider(this.provider).includes(m)) {
      this.model = m
    } else {
      this.model = getDefaultTtsModel(this.provider)
    }

    if (typeof state.voice === 'string') this.voice = state.voice
    if (typeof state.languageType === 'string') this.languageType = state.languageType as TtsLanguageType
    if (typeof state.instructions === 'string') this.instructions = state.instructions
    if (typeof state.localText === 'string') this.localText = state.localText
    if (typeof state.workspaceId === 'string') this.workspaceId = state.workspaceId.trim()
    const sr = state.sampleRate as number | undefined
    if (sr && TTS_SAMPLE_RATES.includes(sr as TtsSampleRate)) this.sampleRate = sr as TtsSampleRate
  }

  beforeDestroy(): void {
    this.cancel()
    super.beforeDestroy()
  }

  /**
   * 由 render.vue 在 audio loadedmetadata 时调——
   * 双保险：fetchAndCommit 里 parseWavDuration 可能因 chunk 布局差异返回 null，
   * render.vue 的 <audio> 元素用浏览器解码器能拿到任何格式的准确时长。
   */
  commitDuration(seconds: number): void {
    this.durationOutput.commit(new NumberValue(seconds))
    this.notifyChanged()
  }
}

// —— 内部辅助 ——

/** MIME → 扩展名（仅覆盖 TTS 常见格式） */
function mimeToExt(mime: string): string | null {
  const m = mime.toLowerCase()
  if (m.includes('wav') || m.includes('wave')) return 'wav'
  if (m.includes('mp3')) return 'mp3'
  if (m.includes('ogg')) return 'ogg'
  if (m.includes('flac')) return 'flac'
  if (m.includes('m4a') || m.includes('mp4')) return 'm4a'
  return null
}

/** 从 ImageGenNode/imageGenerationService 照搬的 djb2 哈希，做 FileValue fingerprint */
function djb2(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

/**
 * 解析 WAV 文件头，返回时长（秒）。
 *
 * 百炼返回的是 RIFF/WAVE 格式，用 DataView 按小端读。
 * 正确的做法是遍历所有 chunk，找到 fmt 和 data 两类——
 * 不要假定 fmt 紧接 RIFF header，因为中间可能夹着 JUNK/fact LIST 等 chunk。
 */
export function parseWavDuration(bytes: Uint8Array): number | null {
  if (bytes.length < 44) return null
  // RIFF 校验
  if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) return null
  if (bytes[8] !== 0x57 || bytes[9] !== 0x41 || bytes[10] !== 0x56 || bytes[11] !== 0x45) return null

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  let fmtDataOffset = -1 // fmt chunk 数据区起始 offset（"fmt " 之后的内容）
  let dataSize = -1

  // 遍历所有 chunk，同时抓 fmt 和 data
  let offset = 12
  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])
    const chunkSize = view.getUint32(offset + 4, true)
    if (id === 'fmt ') {
      fmtDataOffset = offset + 8
      // 如果同时找到了 data，可以提前退出
      if (dataSize > 0) break
    } else if (id === 'data') {
      dataSize = chunkSize
      if (fmtDataOffset > 0) break
    }
    offset += 8 + chunkSize
    if (chunkSize % 2 !== 0) offset += 1
    // 防死循环
    if (chunkSize === 0 || offset > bytes.length) break
  }
  if (fmtDataOffset < 0 || dataSize <= 0) return null
  if (fmtDataOffset + 16 > bytes.length) return null

  // fmt chunk 数据区：audioFormat(2) + channels(2) + sampleRate(4) + byteRate(4) + blockAlign(2) + bitsPerSample(2)
  const channels = view.getUint16(fmtDataOffset + 2, true)
  const sampleRate = view.getUint32(fmtDataOffset + 4, true)
  const bitsPerSample = view.getUint16(fmtDataOffset + 14, true)
  if (channels === 0 || sampleRate === 0 || bitsPerSample === 0) return null

  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8)
  if (bytesPerSecond === 0) return null
  return dataSize / bytesPerSecond
}
