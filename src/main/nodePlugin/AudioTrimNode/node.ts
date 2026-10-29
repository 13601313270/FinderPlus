import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { bytesToBase64 } from '../../engine/data/base64'

export type TrimStatus = 'idle' | 'loading' | 'done' | 'error'

const AUDIO_LABEL = {
  zh: '音频',
  en: 'Audio'
}

export class AudioTrimNode extends Node {
  static readonly TYPE = 'audio-trim'
  readonly type = AudioTrimNode.TYPE

  /** 输入端口：待截取的音频 */
  readonly audioInput = new InputPort('audio', {
    accepts: [AudioFileValue],
    label: {
      zh: '音频',
      en: 'Audio'
    }
  })

  /** 输出端口：截取后的音频（WAV） */
  readonly audioOutput = new OutputPort('audio', AudioFileValue, AUDIO_LABEL)

  // —— 截取参数（秒） ——

  private startTimeValue = 0
  private endTimeValue = 0

  // —— 运行态 ——

  private status: TrimStatus = 'idle'
  private errorMessage = ''
  private resultFile: File | null = null
  private resultHash = ''
  private requestId = 0

  constructor(id: string) {
    super(id)
    this.addInput(this.audioInput)
    this.addOutput(this.audioOutput)
    this.setBox(220, 190)
  }

  // —— UI 读写 ——

  get displayStartTime(): number { return this.startTimeValue }
  setStartTime(v: number): void {
    const n = Number.isFinite(v) ? v : 0
    if (this.startTimeValue === n) return
    this.startTimeValue = n
    this.notifyChanged()
  }

  get displayEndTime(): number { return this.endTimeValue }
  setEndTime(v: number): void {
    const n = Number.isFinite(v) ? v : 0
    if (this.endTimeValue === n) return
    this.endTimeValue = n
    this.notifyChanged()
  }

  get displayStatus(): TrimStatus { return this.status }
  get displayError(): string { return this.errorMessage }
  get previewFile(): File | null { return this.resultFile }
  get previewHash(): string { return this.resultHash }

  /** 输入端口是否接到音频值 */
  get inputAudioFile(): File | null {
    const [first] = this.audioInput.value
    if (first instanceof AudioFileValue && first.file) return first.file
    return null
  }

  // —— 截取 ——

  async run(): Promise<void> {
    const file = this.inputAudioFile
    if (!file) {
      this.status = 'error'
      this.errorMessage = '请先从音频文件节点接入音频'
      this.notifyChanged()
      return
    }
    if (!(this.endTimeValue > this.startTimeValue)) {
      this.status = 'error'
      this.errorMessage = '结束时间必须大于开始时间'
      this.notifyChanged()
      return
    }

    const myRequestId = ++this.requestId
    this.status = 'loading'
    this.errorMessage = ''
    this.beginRun()

    try {
      const arrayBuffer = await file.arrayBuffer()
      const ctx = new AudioContext()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      void ctx.close()

      if (this.requestId !== myRequestId) return

      const duration = audioBuffer.duration
      const start = Math.max(0, Math.min(this.startTimeValue, duration))
      const end = Math.max(start, Math.min(this.endTimeValue, duration))

      const sampleRate = audioBuffer.sampleRate
      const startSample = Math.floor(start * sampleRate)
      const endSample = Math.floor(end * sampleRate)
      const frameCount = endSample - startSample

      if (frameCount <= 0) {
        this.status = 'error'
        this.errorMessage = '截取区间为空，请调整开始/结束时间'
        this.failRun()
        return
      }

      const trimmed = new AudioBuffer({
        length: frameCount,
        numberOfChannels: audioBuffer.numberOfChannels,
        sampleRate
      })
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        trimmed.copyToChannel(audioBuffer.getChannelData(ch).slice(startSample, endSample), ch)
      }

      const wavBytes = audioBufferToWavBytes(trimmed)
      const hash = djb2(bytesToBase64(wavBytes))
      const ab = wavBytes.buffer.slice(
        wavBytes.byteOffset,
        wavBytes.byteOffset + wavBytes.byteLength
      ) as ArrayBuffer
      const outFile = new File([ab], `trim-${Date.now()}.wav`, { type: 'audio/wav' })

      if (this.requestId !== myRequestId) return

      this.audioOutput.commit(new AudioFileValue(outFile, hash))
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

  // —— 端口变化 / 文件拖入 ——

  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    this.notifyChanged()
  }

  isPositionAcceptFileDrop(_x: number, _y: number): boolean { return false }
  onFileDrop(_path: string): void { /* 不处理 */ }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return { ...super.saveState(), startTime: this.startTimeValue, endTime: this.endTimeValue }
  }

  readState(state: Record<string, unknown>): void {
    const s = typeof state.startTime === 'number' ? state.startTime : 0
    const e = typeof state.endTime === 'number' ? state.endTime : 0
    this.startTimeValue = s
    this.endTimeValue = e
  }

  beforeDestroy(): void {
    super.beforeDestroy()
  }
}

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