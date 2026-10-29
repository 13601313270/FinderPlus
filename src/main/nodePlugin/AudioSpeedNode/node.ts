import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { bytesToBase64 } from '../../engine/data/base64'

export type SpeedStatus = 'idle' | 'loading' | 'done' | 'error'

const MIN_SPEED = 0.5
const MAX_SPEED = 3.0
const DEFAULT_SPEED = 1.0

export class AudioSpeedNode extends Node {
  static readonly TYPE = 'audio-speed'
  readonly type = AudioSpeedNode.TYPE

  /** 输入端口：待变速的音频 */
  readonly audioInput = new InputPort('audio', {
    accepts: [AudioFileValue],
    label: {
      zh: '音频',
      en: 'Audio'
    }
  })

  /** 输出端口：变速后的音频（WAV） */
  readonly audioOutput = new OutputPort('audio', AudioFileValue, {
    zh: '音频',
    en: 'Audio'
  })

  /** 输出端口：变速后的时长（秒） */
  readonly durationOutput = new OutputPort('duration', NumberValue, {
    zh: '时长（秒）',
    en: 'Duration (s)'
  })

  // —— 参数 ——

  private speedValue = DEFAULT_SPEED

  // —— 运行态 ——

  private status: SpeedStatus = 'idle'
  private errorMessage = ''
  private resultFile: File | null = null
  private resultHash = ''
  private requestId = 0

  constructor(id: string) {
    super(id)
    this.addInput(this.audioInput)
    this.addOutput(this.audioOutput)
    this.addOutput(this.durationOutput)
    this.setBox(220, 230)
  }

  // —— UI 读写 ——

  get displaySpeed(): number { return this.speedValue }
  setSpeed(v: number): void {
    const clamped = Math.max(MIN_SPEED, Math.min(MAX_SPEED, Number.isFinite(v) ? v : DEFAULT_SPEED))
    // 只保留 0.01 精度，避免 1.0000000000001 这种浮点噪声
    const rounded = Math.round(clamped * 100) / 100
    if (this.speedValue === rounded) return
    this.speedValue = rounded
    this.notifyChanged()
  }

  get displayStatus(): SpeedStatus { return this.status }
  get displayError(): string { return this.errorMessage }
  get previewFile(): File | null { return this.resultFile }
  get previewHash(): string { return this.resultHash }
  get minSpeed(): number { return MIN_SPEED }
  get maxSpeed(): number { return MAX_SPEED }

  /** 输入端口是否接到音频值 */
  get inputAudioFile(): File | null {
    const [first] = this.audioInput.value
    if (first instanceof AudioFileValue && first.file) return first.file
    return null
  }

  // —— 变速 ——

  /**
   * 用 OfflineAudioContext + BufferSourceNode.playbackRate 做变速。
   *
   * 注意：这个方案同时改变音调（像磁带快转/慢放）。
   * 如需"变速不变调"（time-stretch + pitch-preserve），需要 soundtouchjs 等 DSP 库，
   * 后续有需求再加。当前先交付简单但稳定的版本。
   */
  async run(): Promise<void> {
    const file = this.inputAudioFile
    if (!file) {
      this.status = 'error'
      this.errorMessage = '请先接入音频'
      this.notifyChanged()
      return
    }

    const speed = this.speedValue
    if (speed <= 0) {
      this.status = 'error'
      this.errorMessage = '速度必须大于 0'
      this.notifyChanged()
      return
    }

    const myRequestId = ++this.requestId
    this.status = 'loading'
    this.errorMessage = ''
    this.beginRun()

    try {
      // 解码原音频
      const ctx = new AudioContext()
      const audioBuffer = await ctx.decodeAudioData(await file.arrayBuffer())
      void ctx.close()
      if (this.requestId !== myRequestId) return

      // 按变速比例计算目标时长和样本数
      const outDuration = audioBuffer.duration / speed
      const outFrames = Math.ceil(audioBuffer.length / speed)

      const offline = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        outFrames,
        audioBuffer.sampleRate
      )

      const src = offline.createBufferSource()
      src.buffer = audioBuffer
      src.playbackRate.value = speed
      src.connect(offline.destination)
      src.start(0)

      const rendered = await offline.startRendering()
      if (this.requestId !== myRequestId) return

      // 编码成 WAV
      const wavBytes = audioBufferToWavBytes(rendered)
      const hash = djb2(bytesToBase64(wavBytes))
      const ab = wavBytes.buffer.slice(
        wavBytes.byteOffset,
        wavBytes.byteOffset + wavBytes.byteLength
      ) as ArrayBuffer
      const outFile = new File([ab], `speed-${speed}x-${Date.now()}.wav`, { type: 'audio/wav' })

      if (this.requestId !== myRequestId) return

      this.audioOutput.commit(new AudioFileValue(outFile, hash))
      this.durationOutput.commit(new NumberValue(outDuration))
      this.resultFile = outFile
      this.resultHash = hash
      this.status = 'done'
      this.errorMessage = ''
      this.completeRun()
    } catch (err) {
      if (this.requestId !== myRequestId) return
      this.status = 'error'
      this.errorMessage = (err as Error)?.message || String(err)
      this.failRun()
    } finally {
      if (this.requestId === myRequestId) this.notifyChanged()
    }
  }

  // —— 端口变化 ——

  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    this.notifyChanged()
  }

  isPositionAcceptFileDrop(_x: number, _y: number): boolean { return false }
  onFileDrop(_path: string): void { /* 不处理 */ }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return { ...super.saveState(), speed: this.speedValue }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    if (typeof state.speed === 'number') {
      this.speedValue = Math.round(
        Math.max(MIN_SPEED, Math.min(MAX_SPEED, state.speed)) * 100
      ) / 100
    }
  }

  beforeDestroy(): void {
    super.beforeDestroy()
  }
}

// —— 内部辅助 ——

/** AudioBuffer → 16-bit PCM WAV 字节 */
function audioBufferToWavBytes(buffer: AudioBuffer): Uint8Array {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const numFrames = buffer.length
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const dataSize = numFrames * blockAlign

  const ab = new ArrayBuffer(44 + dataSize)
  const view = new DataView(ab)
  let offset = 0

  const writeString = (str: string): void => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset++, str.charCodeAt(i))
  }
  const writeUint32 = (v: number): void => { view.setUint32(offset, v, true); offset += 4 }
  const writeUint16 = (v: number): void => { view.setUint16(offset, v, true); offset += 2 }

  writeString('RIFF')
  writeUint32(36 + dataSize)
  writeString('WAVE')
  writeString('fmt ')
  writeUint32(16)
  writeUint16(1) // PCM
  writeUint16(numChannels)
  writeUint32(sampleRate)
  writeUint32(sampleRate * blockAlign)
  writeUint16(blockAlign)
  writeUint16(bitsPerSample)
  writeString('data')
  writeUint32(dataSize)

  const channels: Float32Array[] = []
  for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch))

  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, int16, true)
      offset += 2
    }
  }

  return new Uint8Array(ab)
}

function djb2(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}
