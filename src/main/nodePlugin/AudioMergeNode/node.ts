import { AudioFileCollectionValue } from '../../engine/data/AudioFileCollectionValue'
import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { bytesToBase64 } from '../../engine/data/base64'
import { getSharedAudioContext } from '../AudioFileNode/sharedAudio'

export type MergeStatus = 'idle' | 'loading' | 'done' | 'error'

const AUDIO_LABEL = {
  zh: '音频',
  en: 'Audio'
}

export class AudioMergeNode extends Node {
  static readonly TYPE = 'audio-merge'
  readonly type = AudioMergeNode.TYPE

  /** 输入端口：音频集合（AudioFolderNode 的全部音频输出） */
  readonly collectionInput = new InputPort('collection', {
    accepts: [AudioFileCollectionValue],
    label: {
      zh: '音频集合',
      en: 'Audio Collection'
    }
  })

  /** 输入端口：单个音频（支持多输入节点 Wire 过来） */
  readonly audioInput = new InputPort('audio', {
    accepts: [AudioFileValue],
    label: {
      zh: '音频',
      en: 'Audio'
    },
    optional: true
  })

  /** 输出端口：拼接后的音频（WAV） */
  readonly audioOutput = new OutputPort('audio', AudioFileValue, AUDIO_LABEL)

  /** 方法端口：外部触发一次拼接 */
  readonly mergeMethod = new MethodPort('merge', {
    label: {
      zh: '触发拼接',
      en: 'Trigger Merge'
    }
  })

  // —— 运行态 ——

  private status: MergeStatus = 'idle'
  private errorMessage = ''
  private resultFile: File | null = null
  private resultHash = ''
  private requestId = 0

  constructor(id: string) {
    super(id)
    this.addInput(this.collectionInput)
    this.addInput(this.audioInput)
    this.addOutput(this.audioOutput)
    this.addMethod(this.mergeMethod)
    this.mergeMethod.onTrigger(() => this.run())
    this.setBox(220, 150)
  }

  // —— UI 读写 ——

  get displayStatus(): MergeStatus { return this.status }
  get displayError(): string { return this.errorMessage }
  get previewFile(): File | null { return this.resultFile }
  get previewHash(): string { return this.resultHash }
  /** UI 显示用：当前可拼接的音频数量 */
  get displayInputCount(): number { return this.collectInputFiles().length }
  /** UI 显示用：是否有有效输入（决定按钮能否点击） */
  get hasValidInput(): boolean { return this.displayInputCount > 0 }

  /** 从两个输入端口收集所有待合并的音频文件 */
  private collectInputFiles(): File[] {
    const files: File[] = []

    // 优先从 collection 端口取（value 是数组，取第一个）
    const colValue = this.collectionInput.value[0]
    if (colValue instanceof AudioFileCollectionValue && colValue.items && !colValue.isNull) {
      for (const item of colValue.items) {
        if (item instanceof AudioFileValue && item.file) files.push(item.file)
      }
    }

    // 再追加单独 audio 端口的
    const single = this.audioInput.value[0]
    if (single instanceof AudioFileValue && single.file) {
      files.push(single.file)
    }

    return files
  }

  // —— 合并 ——

  async run(): Promise<void> {
    const files = this.collectInputFiles()
    if (files.length === 0) {
      this.status = 'error'
      this.errorMessage = '请先接入音频'
      this.notifyChanged()
      return
    }

    const myRequestId = ++this.requestId
    this.status = 'loading'
    this.errorMessage = ''
    this.beginRun()

    try {
      const ctx = getSharedAudioContext()

      // 1. 解码所有音频
      const decoded: AudioBuffer[] = []
      for (const file of files) {
        const ab = await file.arrayBuffer()
        const buf = await ctx.decodeAudioData(ab.slice(0))
        decoded.push(buf)
        if (this.requestId !== myRequestId) return
      }

      // 2. 统一采样率：以第一个音频的采样率为目标
      const targetSampleRate = decoded[0].sampleRate

      // 3. 统一声道数：取最大值
      const targetChannels = Math.max(...decoded.map(b => b.numberOfChannels))

      // 4. 重采样 + 声道补齐
      const normalized: AudioBuffer[] = []
      for (const buf of decoded) {
        const resampled = await resampleBuffer(buf, targetSampleRate, ctx)
        const channelAligned = alignChannels(resampled, targetChannels)
        normalized.push(channelAligned)
        if (this.requestId !== myRequestId) return
      }

      // 5. 计算总帧数，拼接
      const totalFrames = normalized.reduce((acc, b) => acc + b.length, 0)
      const merged = new AudioBuffer({
        length: totalFrames,
        numberOfChannels: targetChannels,
        sampleRate: targetSampleRate
      })

      let offset = 0
      for (const buf of normalized) {
        for (let ch = 0; ch < targetChannels; ch++) {
          merged.copyToChannel(buf.getChannelData(ch), ch, offset)
        }
        offset += buf.length
      }

      // 6. 编码 WAV
      const wavBytes = audioBufferToWavBytes(merged)
      const hash = djb2(bytesToBase64(wavBytes))
      const ab = wavBytes.buffer.slice(
        wavBytes.byteOffset,
        wavBytes.byteOffset + wavBytes.byteLength
      ) as ArrayBuffer
      const outFile = new File([ab], `merged-${Date.now()}.wav`, { type: 'audio/wav' })

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

  // —— 端口变化 ——

  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    this.notifyChanged()
  }

  isPositionAcceptFileDrop(_x: number, _y: number): boolean { return false }
  onFileDrop(_path: string): void { /* 不处理 */ }

  // —— 持久化 ——

  getSaveDataByState(): Record<string, unknown> {
    return { ...super.getSaveDataByState() }
  }

  initStateBySaveData(_state: Record<string, unknown>): void {
    super.initStateBySaveData(_state)
  }

  beforeDestroy(): void {
    super.beforeDestroy()
  }
}

// —— 内部辅助 ——

/**
 * 重采样：用 OfflineAudioContext 把 buffer 渲染成目标采样率。
 * 采样率相同直接返回原 buffer，不做多余开销。
 */
async function resampleBuffer(
  buffer: AudioBuffer,
  targetSampleRate: number,
  _ctx: AudioContext
): Promise<AudioBuffer> {
  if (buffer.sampleRate === targetSampleRate) return buffer

  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(buffer.length * targetSampleRate / buffer.sampleRate),
    targetSampleRate
  )
  const src = offline.createBufferSource()
  src.buffer = buffer
  src.connect(offline.destination)
  src.start(0)
  return await offline.startRendering()
}

/**
 * 声道对齐：目标比源多 → 复制最后一个声道填充；目标比源少 → 截断多余声道。
 */
function alignChannels(buffer: AudioBuffer, targetChannels: number): AudioBuffer {
  if (buffer.numberOfChannels === targetChannels) return buffer

  const out = new AudioBuffer({
    length: buffer.length,
    numberOfChannels: targetChannels,
    sampleRate: buffer.sampleRate
  })

  for (let ch = 0; ch < targetChannels; ch++) {
    const srcCh = Math.min(ch, buffer.numberOfChannels - 1)
    out.copyToChannel(buffer.getChannelData(srcCh), ch)
  }
  return out
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
