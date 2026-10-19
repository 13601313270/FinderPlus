import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { bytesToBase64, base64ToBytes } from '../../engine/data/base64'
import { readImageProviderKey } from '../ImageGenNode/providers'
import {
  resolveTtsEndpoint,
  TTS_MODEL_IDS,
  DEFAULT_TTS_MODEL,
  TTS_LANGUAGE_TYPES,
  isAudioGenModel,
  isMaasModel,
  type TtsModelId,
  type TtsLanguageType,
  type ResolvedTtsEndpoint
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

  private model: TtsModelId = DEFAULT_TTS_MODEL
  private voice = 'Cherry'
  private languageType: TtsLanguageType = 'Chinese'
  private instructions = '' // 仅 qwen3-tts-instruct-flash 有效
  private workspaceId = '' // 仅 qwen-audio-3.1-tts-next 有效：业务空间 ID

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
    this.addMethod(this.generateMethod)
    this.generateMethod.onTrigger(() => this.manualTrigger())
    this.setBox(240, 240)
  }

  // —— UI 读写 ——

  get displayModel(): TtsModelId { return this.model }
  setModel(v: TtsModelId): void {
    if (!TTS_MODEL_IDS.includes(v)) return
    if (this.model === v) return
    this.model = v
    // 切到不支持 instructions 的模型时清空
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

  /** 百炼 API Key 是否配了（DashScope key，两个模型共用） */
  get hasDashscopeKey(): boolean {
    return readImageProviderKey('dashscope').length > 0
  }

  /** 业务空间 ID 是否配了（所有 MAAS 端点模型都需要） */
  get hasWorkspaceId(): boolean {
    return this.workspaceId.length > 0
  }

  /** 综合：当前模型的鉴权配置是否完整 */
  get hasProviderKey(): boolean {
    if (isMaasModel(this.model)) {
      return this.hasDashscopeKey && this.hasWorkspaceId
    }
    return this.hasDashscopeKey
  }

  /** 是否使用 MAAS 端点 */
  get isMaasMode(): boolean {
    return isMaasModel(this.model)
  }

  /** 是否使用 Audiogen（支持参考音频音色克隆） */
  get isAudioGenMode(): boolean {
    return isAudioGenModel(this.model)
  }

  /** 当前模型是否支持 instructions */
  get modelSupportsInstructions(): boolean {
    return resolveTtsEndpoint(this.model).supportsInstructions
  }

  /** 可用音色选项（根据模型自动切换 MAAS / DashScope 列表） */
  get availableVoices(): readonly { id: string; label: string }[] {
    const preset = resolveTtsEndpoint(this.model)
    const voices = preset.voices ?? []
    return voices.map(v => ({
      id: v.id,
      label: `${v.label.zh} / ${v.label.en}`
    }))
  }

  /** 可用语言选项 */
  get availableLanguages(): readonly string[] { return TTS_LANGUAGE_TYPES }

  /** 可用模型选项 */
  get availableModels(): readonly TtsModelId[] { return TTS_MODEL_IDS }

  // —— 触发生成 ——

  manualTrigger(): void {
    const text = this.displayText.trim()
    if (!text) {
      this.status = 'error'
      this.errorMessage = '请输入要合成的文本'
      this.notifyChanged()
      return
    }
    if (this.isMaasMode && !this.workspaceId) {
      this.status = 'error'
      this.errorMessage = '请先填写业务空间 ID（Workspace ID）——可在百炼控制台「业务空间」页面找到'
      this.notifyChanged()
      return
    }
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
      const endpoint = resolveTtsEndpoint(this.model, this.workspaceId)
      if (!endpoint.key) {
        throw new Error('百炼 API Key 未配置。请先在图片生成节点的设置里填写阿里云百炼的 API Key（两个节点共用同一个 key）。')
      }

      // —— 1. 构造请求体（根据 requestFormat 走不同分支） ——
      let bodyStr: string
      let outMime = 'audio/wav'
      let outExt = 'wav'

      if (endpoint.requestFormat === 'dashscope-sync') {
        // 旧模型：qwen3-tts-flash / qwen3-tts-instruct-flash
        const body: Record<string, unknown> = {
          model: this.model,
          input: { text, voice: this.voice, language_type: this.languageType }
        }
        if (endpoint.supportsInstructions && this.instructions.trim()) {
          body.input = { ...(body.input as Record<string, unknown>), instructions: this.instructions.trim() }
          body.parameters = { optimize_instructions: true }
        }
        bodyStr = JSON.stringify(body)
      } else if (endpoint.requestFormat === 'maas-simple') {
        // MAAS 简单文生语音：qwen-audio-3.1-tts-flash
        const input: Record<string, unknown> = {
          text,
          voice: this.voice,
          format: endpoint.defaultFormat ?? 'wav',
          sample_rate: endpoint.defaultSampleRate ?? 24000
        }
        if (endpoint.supportsInstructions && this.instructions.trim()) {
          input.instruction = this.instructions.trim()
        }
        bodyStr = JSON.stringify({ model: this.model, input })
      } else {
        // MAAS Audiogen：qwen-audio-3.1-tts-next —— 支持参考音频音色克隆
        const audiogenInput: Record<string, unknown> = {
          text_prompt: text,
          format: endpoint.defaultFormat ?? 'wav',
          sample_rate: endpoint.defaultSampleRate ?? 24000
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

        bodyStr = JSON.stringify({ model: this.model, input: audiogenInput })
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
      const blob = await audioRes.blob()
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      const fileName = `tts-${Date.now()}.${outExt}`
      const file = new File([ab], fileName, { type: outMime })
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
      const duration = parseWavDuration(bytes)
      if (duration !== null) {
        this.durationOutput.commit(new NumberValue(Number(duration.toFixed(3))))
      }
      this.resultFile = file
      this.resultHash = hash
      this.status = 'done'
      this.errorMessage = ''
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        this.status = 'idle'
        this.errorMessage = ''
      } else {
        this.status = 'error'
        this.errorMessage = (err as Error).message || String(err)
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
      model: this.model,
      voice: this.voice,
      languageType: this.languageType,
      instructions: this.instructions,
      localText: this.localText,
      workspaceId: this.workspaceId
    }
  }

  readState(state: Record<string, unknown>): void {
    const m = state.model as TtsModelId | undefined
    if (m && TTS_MODEL_IDS.includes(m)) this.model = m
    if (typeof state.voice === 'string') this.voice = state.voice
    if (typeof state.languageType === 'string') this.languageType = state.languageType as TtsLanguageType
    if (typeof state.instructions === 'string') this.instructions = state.instructions
    if (typeof state.localText === 'string') this.localText = state.localText
    if (typeof state.workspaceId === 'string') this.workspaceId = state.workspaceId.trim()
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
 * 百炼返回的是标准 RIFF/WAVE PCM，用 DataView 按小端读：
 * - fmt chunk 起始：offset 12（"fmt " 标识）
 * - channels：offset 18 → Uint16
 * - sampleRate：offset 20 → Uint32
 * - bitsPerSample：offset 30 → Uint16
 * - data chunk：在文件里搜索 "data" 标识 → dataSize → duration = dataSize / (sampleRate * channels * (bitsPerSample/8))
 *
 * 解析失败（非标准 WAV）返回 null，端口跳过 commit。
 */
export function parseWavDuration(bytes: Uint8Array): number | null {
  if (bytes.length < 44) return null
  // RIFF 校验
  if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) return null
  if (bytes[8] !== 0x57 || bytes[9] !== 0x41 || bytes[10] !== 0x56 || bytes[11] !== 0x45) return null

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  // 在文件里找 data chunk（从 offset 12 开始遍历 chunk）
  let offset = 12
  let dataSize = -1
  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])
    const chunkSize = view.getUint32(offset + 4, true)
    if (id === 'data') {
      dataSize = chunkSize
      break
    }
    offset += 8 + chunkSize
    if (chunkSize % 2 !== 0) offset += 1 // chunk 对齐
  }
  if (dataSize <= 0) return null

  // 读 fmt chunk（应该在 data 之前）
  // 简化：按标准 PCM 布局直接读 offset 18-31
  if (bytes.length < 36) return null
  const channels = view.getUint16(18, true)
  const sampleRate = view.getUint32(20, true)
  const bitsPerSample = view.getUint16(30, true)
  if (channels === 0 || sampleRate === 0 || bitsPerSample === 0) return null

  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8)
  if (bytesPerSecond === 0) return null
  return dataSize / bytesPerSecond
}
