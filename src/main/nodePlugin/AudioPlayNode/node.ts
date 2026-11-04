import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { VideoFileValue } from '../../engine/data/VideoFileValue'
import { FileValue } from '../../engine/data/FileValue'
import { InputPort } from '../../engine/port/InputPort'
import { Node } from '../../engine/node/Node'

/**
 * 音频播放节点：接收 FileValue 子类（AudioFileValue / VideoFileValue / FileValue），
 * 在**模型层**直接持有 HTMLAudioElement + AudioContext（renderer 进程，可以用 DOM API）。
 *
 * 播放引擎 = 两套配合：
 *   1. HTMLAudioElement：负责播放控制（play / pause / currentTime / timeupdate）
 *   2. AudioContext.decodeAudioData：负责**拿真实 duration**
 *      — Audio.duration 对 webm live 录制文件会返回 Infinity（metadata 里没有总时长），
 *      — decodeAudioData 解码完 AudioBuffer.duration 就是真实时长，跟容器格式无关。
 *
 * 播放引擎放在模型层的原因：
 *   NodeShell 在 minimized 时会销毁 render.vue（v-if），Audio 随之消失。
 *   把 Audio 提升到 Node 上，minimized 只是 UI 隐藏，播放引擎继续跑。
 */
export class AudioPlayNode extends Node {
  static readonly TYPE = 'audio-play'
  readonly type = AudioPlayNode.TYPE

  readonly audioInput = new InputPort('audio', {
    accepts: [AudioFileValue, VideoFileValue, FileValue],
    label: {
      zh: '音频/视频',
      en: 'Audio / Video',
      ja: '音声/動画',
      ko: '오디오 / 비디오',
      es: 'Audio / Video',
      ar: 'صوت / فيديو',
      fr: 'Audio / Vidéo',
      pt: 'Áudio / Vídeo',
      ru: 'Аудио / Видео',
      hi: 'ऑडियो / वीडियो',
      id: 'Audio / Video',
      de: 'Audio / Video',
      vi: 'Âm thanh / Video',
      tr: 'Ses / Video',
      it: 'Audio / Video'
    }
  })

  // —— 运行时引擎（不持久化）——

  /** 播放控制：play / pause / currentTime / timeupdate */
  private audio: HTMLAudioElement | null = null

  /** 时长引擎：decodeAudioData 拿真实 duration */
  private audioCtx: AudioContext | null = null

  /** src blob URL */
  private blobUrl: string | null = null

  /** 当前文件引用（render.vue 读文件名） */
  private _sourceFile: File | undefined

  // 状态快照——render.vue 通过 snapshot() 读
  private _isPlaying = false
  private _currentTime = 0
  private _duration = 0

  /** 订阅者 */
  private playerSubscribers = new Set<() => void>()

  constructor(id: string) {
    super(id)
    this.addInput(this.audioInput)
    this.setBox(160, 160)
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean { return false }
  onFileDrop(_sourcePath: string): void { /* 不处理 */ }

  inputPortReceiveValue(_ports: InputPort[]): void {
    this.rebuildAudio()
    this.notifyChanged()
    this.completeRun()
  }

  // —— 引擎生命周期 ——

  private rebuildAudio(): void {
    this.dispose()

    const [first] = this.audioInput.value
    const file = first && 'file' in first ? (first as { file?: File }).file : undefined
    this._sourceFile = file

    if (!file) {
      this.notifyPlayerChanged()
      return
    }

    this.blobUrl = URL.createObjectURL(file)

    // 1) 播放引擎
    const audio = new Audio()
    audio.preload = 'auto'
    audio.addEventListener('loadedmetadata', () => {
      void audio.play().catch(() => { /* autoplay 策略兜底 */ })
    })
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

    // 2) 时长引擎：decodeAudioData 解码拿真实 duration
    //    不依赖 Audio.duration（webm live 录制会返回 Infinity）
    this._decodeDuration(file).catch(() => { /* 解码失败静默忽略 */ })
  }

  /** Web Audio API 解码 → 拿真实 duration，写进 this._duration 并通知订阅者 */
  private async _decodeDuration(file: File): Promise<void> {
    // 新建 AudioContext（浏览器单例不规范，这里每次重建跟 Audio 引擎同步生命周期）
    const ctx = new AudioContext()
    this.audioCtx = ctx
    try {
      const arrayBuffer = await file.arrayBuffer()
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0))
      // 检查 Audio 还活着（没有被下一次 rebuildAudio 替换）
      if (this.audioCtx !== ctx) return
      this._duration = decoded.duration
      this.notifyPlayerChanged()
    } finally {
      ctx.close().catch(() => { /* 关闭失败忽略 */ })
      if (this.audioCtx === ctx) this.audioCtx = null
    }
  }

  /** 完整清理，节点销毁或输入变化时调 */
  private dispose(): void {
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
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {})
      this.audioCtx = null
    }
    this._isPlaying = false
    this._currentTime = 0
    this._duration = 0
  }

  // —— 对外 API ——

  get sourceFile(): File | undefined { return this._sourceFile }

  snapshot(): { fileName: string | undefined; isPlaying: boolean; currentTime: number; duration: number } {
    return {
      fileName: this._sourceFile?.name,
      isPlaying: this._isPlaying,
      currentTime: this._currentTime,
      duration: this._duration
    }
  }

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

  seekTo(sec: number): void {
    if (!this.audio || !isFinite(sec)) return
    this.audio.currentTime = sec
    this._currentTime = sec
    this.notifyPlayerChanged()
  }

  // —— Node 基类钩子 ——

  beforeDestroy(): void {
    this.dispose()
    this.playerSubscribers.clear()
  }

  saveState(): Record<string, unknown> {
    return { ...super.saveState(), box: this.box }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)
    const box = state.box as [number, number] | undefined
    if (box !== undefined) {
      this.setBox(Math.round(box[0]), Math.round(box[1]))
    }
  }
}
