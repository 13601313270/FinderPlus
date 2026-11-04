import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { FileNode } from '../FileNode/node'
import { inferAudioMime } from './mime'

/** 音频文件后缀集合 */
const ACCEPTED_EXTS = new Set([
  '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.webm', '.opus'
])

export class AudioFileNode extends FileNode {
  static readonly TYPE = 'audio-file'

  static override acceptsExtension(ext: string): boolean {
    return ACCEPTED_EXTS.has(ext)
  }

  readonly type = AudioFileNode.TYPE

  /** 文件输出（AudioFileValue，kind = 'audio-file'） */
  readonly fileOutput = new OutputPort('file', AudioFileValue, {
    zh: '文件',
    en: 'File',
    ja: 'ファイル',
    ko: '파일',
    es: 'Archivo',
    ar: 'ملف',
    fr: 'Fichier',
    pt: 'Ficheiro',
    ru: 'Файл',
    hi: 'फ़ाइल',
    id: 'Berkas',
    de: 'Datei',
    vi: 'Tệp',
    tr: 'Dosya',
    it: 'File'
  })

  /** 时长输出（秒） */
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

  /** 文件数据输入端口：只接受同类型音频文件 */
  readonly fileInput = new InputPort('file-in', {
    accepts: [AudioFileValue],
    label: {
      zh: '写入数据',
      en: 'Write Data',
      ja: 'データを書き込む',
      ko: '데이터 쓰기',
      es: 'Escribir datos',
      ar: 'كتابة البيانات',
      fr: 'Écrire des données',
      pt: 'Gravar dados',
      ru: 'Запись данных',
      hi: 'डेटा लिखें',
      id: 'Tulis Data',
      de: 'Daten schreiben',
      vi: 'Ghi dữ liệu',
      tr: 'Veri yaz',
      it: 'Scrivi dati'
    }
  })

  /** 方法端口：上游 commit 任意值即触发一次播放（从头开始） */
  readonly playPort = new MethodPort('play', {
    label: {
      zh: '播放',
      en: 'Play',
      ja: '再生',
      ko: '재생',
      es: 'Reproducir',
      ar: 'تشغيل',
      fr: 'Lecture',
      pt: 'Reproduzir',
      ru: 'Воспроизвести',
      hi: 'चलाएँ',
      id: 'Putar',
      de: 'Abspielen',
      vi: 'Phát',
      tr: 'Oynat',
      it: 'Riproduci'
    }
  })

  // —— 运行时播放引擎（不持久化）——
  // 放在模型层：minimized 时 render.vue 销毁，Audio 仍存活，播放状态不丢失。

  /** 播放引擎：play / pause / seek */
  private audio: HTMLAudioElement | null = null

  /** src blob URL，重建或销毁时 revoke */
  private blobUrl: string | null = null

  /** 当前 File 引用，给 Audio 做 blobUrl 用 */
  private _currentFile: File | undefined

  // 播放时状态——render.vue 通过 snapshot() 读
  private _isPlaying = false
  private _currentTime = 0
  private _duration = 0

  /** UI 状态订阅者 */
  private playerSubscribers = new Set<() => void>()

  constructor(id: string) {
    super(id)
    this.addOutput(this.fileOutput)
    this.addOutput(this.durationOutput)
    this.addOutput(this.pathOutput)
    this.addMethod(this.playPort)
    this.playPort.onTrigger(() => {
      this.playFromStart()
    })
    this.bindFileInput(this.fileInput)
    this.setBox(140, 160)
  }

  /**
   * 画布启动就绪时：先调基类注册文件系统监听，再主动读一次磁盘文件。
   * Audio 引擎也一起重建。
   */
  override onReady(): void {
    super.onReady()
    if (this.fileNameValue) {
      void this.reloadFileContent()
    }
  }

  /** 文件被替换后：重读二进制 → setContent 会重建 Audio + commit 端口 */
  override async reloadFileContent(): Promise<void> {
    if (!this.fileName) return
    try {
      // @ts-ignore
      const base64 = await window.fileApi.readBinary(this.fileName)
      this.setContent(base64)
    } catch { /* 文件可能已被删，静默忽略 */ }
  }

  /**
   * 写入音频二进制：commit 端口 → 重建 Audio 播放引擎 → 异步解码时长。
   */
  setContent(base64: string): void {
    if (!this.fileName) return
    const mime = inferAudioMime(this.fileName)
    const bytes = base64ToBytes(base64)
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const file = new File([ab], this.fileName, { type: mime })
    const hash = djb2(base64)
    this._currentFile = file
    this.fileOutput.commit(new AudioFileValue(file, hash))
    this.notifyChanged()
    // 重建 Audio 播放引擎
    this.rebuildAudio()
    // 异步解码时长 → 同时 commit durationOutput 端口 + 更新 _duration 供 UI 显示
    void this.decodeAndCommitDuration(ab)
  }

  /**
   * Web Audio API 解码 → commit durationOutput + 更新 _duration 供 UI。
   * 解码是跨格式的可靠方式，不依赖 Audio.duration（webm live 会返回 Infinity）。
   */
  private async decodeAndCommitDuration(ab: ArrayBuffer): Promise<void> {
    try {
      const ctx = new AudioContext()
      try {
        const audioBuffer = await ctx.decodeAudioData(ab.slice(0))
        const seconds = Number(audioBuffer.duration.toFixed(3))
        if (seconds > 0 && isFinite(seconds)) {
          this.durationOutput.commit(new NumberValue(seconds))
          // 同时写内部状态，通知 UI 刷新总时长显示
          this._duration = seconds
          this.notifyPlayerChanged()
          this.notifyChanged()
        }
      } finally {
        await ctx.close()
      }
    } catch { /* 解码失败静默忽略 */ }
  }

  // —— Audio 引擎生命周期 ——

  private rebuildAudio(): void {
    this.disposeAudio()
    if (!this._currentFile) {
      this.notifyPlayerChanged()
      return
    }

    this.blobUrl = URL.createObjectURL(this._currentFile)
    const audio = new Audio()
    audio.preload = 'metadata'

    audio.addEventListener('timeupdate', () => {
      this._currentTime = audio.currentTime
      this.notifyPlayerChanged()
    })
    audio.addEventListener('play', () => {
      this._isPlaying = true
      this.notifyPlayerChanged()
    })
    audio.addEventListener('pause', () => {
      this._isPlaying = false
      this.notifyPlayerChanged()
    })
    audio.addEventListener('ended', () => {
      this._isPlaying = false
      this._currentTime = 0
      this.notifyPlayerChanged()
    })

    audio.src = this.blobUrl
    this.audio = audio
  }

  private disposeAudio(): void {
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
      this.audio = null
    }
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl)
      this.blobUrl = null
    }
    this._isPlaying = false
    this._currentTime = 0
  }

  // —— 对外 API ——

  /** 播放状态快照，render.vue 每次订阅回调里读 */
  snapshot(): {
    fileName: string | undefined
    fileRevision: number
    fileSize: number | undefined
    displayFormat: string
    isPlaying: boolean
    currentTime: number
    duration: number
  } {
    return {
      fileName: this.fileName,
      fileRevision: this.fileRevision,
      fileSize: this.fileSize,
      displayFormat: this.displayFormat,
      isPlaying: this._isPlaying,
      currentTime: this._currentTime,
      duration: this._duration
    }
  }

  /** 订阅播放状态变化，返回取消函数 */
  subscribePlayer(fn: () => void): () => void {
    this.playerSubscribers.add(fn)
    return () => this.playerSubscribers.delete(fn)
  }

  private notifyPlayerChanged(): void {
    this.playerSubscribers.forEach(fn => fn())
  }

  togglePlay(): void {
    if (!this.audio) return
    if (this.audio.paused) {
      void this.audio.play().catch(() => { /* 用户手势缺失 */ })
    } else {
      this.audio.pause()
    }
  }

  playFromStart(): void {
    if (!this.audio) return
    this.audio.currentTime = 0
    void this.audio.play().catch(() => { /* 用户手势缺失 */ })
  }

  seekTo(sec: number): void {
    if (!this.audio || !isFinite(sec)) return
    this.audio.currentTime = sec
    this._currentTime = sec
    this.notifyPlayerChanged()
  }

  // —— 展示用元数据 ——

  get displayFormat(): string {
    const mime = this.fileName ? inferAudioMime(this.fileName) : ''
    const map: Record<string, string> = {
      'audio/mpeg': 'MP3',
      'audio/wav': 'WAV',
      'audio/ogg': 'OGG',
      'audio/mp4': 'M4A',
      'audio/flac': 'FLAC',
      'audio/aac': 'AAC',
      'audio/webm': 'WebM',
      'audio/opus': 'Opus'
    }
    return map[mime] ?? mime
  }

  /** 当前音频 MIME */
  get audioType(): string {
    return this.fileName ? inferAudioMime(this.fileName) : ''
  }

  // —— Node 基类钩子 ——

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean { return false }
  onFileDrop(_sourcePath: string): void { /* 不处理 */ }

  override async beforeDestroy(): Promise<void> {
    this.disposeAudio()
    this.playerSubscribers.clear()
  }
}
