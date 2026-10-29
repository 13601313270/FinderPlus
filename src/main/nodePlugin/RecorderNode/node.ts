import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { bytesToBase64 } from '../../engine/data/base64'

type RecorderStatus = 'idle' | 'recording' | 'done' | 'error'

export class RecorderNode extends Node {
  static readonly TYPE = 'audio-record'
  readonly type = RecorderNode.TYPE

  // —— 端口 ——

  /** 录音输出：AudioFileValue（完成后 commit） */
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

  /** 录音时长（秒） */
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

  // —— 运行态（render.vue 在停止录音后通过 commitRecording 写回来）——

  private status: RecorderStatus = 'idle'
  private errorMessage = ''
  private recordingSeconds = 0
  private lastFile: File | null = null

  constructor(id: string) {
    super(id)
    this.addOutput(this.audioOutput)
    this.addOutput(this.durationOutput)
    this.setBox(180, 172)
  }

  // —— UI 读写 ——

  get displayStatus(): RecorderStatus { return this.status }
  get displayError(): string { return this.errorMessage }
  get displayRecordingSeconds(): number { return this.recordingSeconds }
  get previewFile(): File | null { return this.lastFile }

  /**
   * 由 render.vue 在 MediaRecorder.onstop 时调——
   * Blob → File → commit 两个输出端口 + 落盘。
   */
  async commitRecording(blob: Blob, durationSec: number): Promise<void> {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const hash = djb2(bytesToBase64(bytes))
    // MediaRecorder 默认 mime 是浏览器选定的（webm/ogg/mp4 等），让浏览器自己解
    const file = new File([bytes], `recording-${Date.now()}.${mimeToExt(blob.type)}`, { type: blob.type || 'audio/webm' })

    this.audioOutput.commit(new AudioFileValue(file, hash))
    this.durationOutput.commit(new NumberValue(Number(durationSec.toFixed(3))))

    this.lastFile = file
    this.recordingSeconds = durationSec
    this.status = 'done'
    this.errorMessage = ''
    this.notifyChanged()
  }

  /** render.vue 捕获错误时调 */
  setError(msg: string): void {
    this.status = 'error'
    this.errorMessage = msg
    this.notifyChanged()
  }

  /** render.vue 开始录音时调 */
  setRecording(): void {
    this.status = 'recording'
    this.errorMessage = ''
    this.notifyChanged()
  }

  /** 清除上次录音结果 */
  clearResult(): void {
    this.lastFile = null
    this.recordingSeconds = 0
    this.status = 'idle'
    this.errorMessage = ''
    // commit null 值到输出端口（让下游感知）
    this.audioOutput.commit(new AudioFileValue())
    this.durationOutput.commit(new NumberValue())
    this.notifyChanged()
  }

  // —— 基类抽象方法兜底 ——

  isPositionAcceptFileDrop(_x: number, _y: number): boolean { return false }
  onFileDrop(_path: string): void { /* 不处理 */ }
  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void { /* 无输入端口 */ }

  saveState(): Record<string, unknown> { return { ...super.saveState() } }
  readState(_state: Record<string, unknown>): void { /* 无持久化配置 */ }

  beforeDestroy(): void {
    super.beforeDestroy()
  }
}

// —— 内部辅助 ——

function djb2(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

/** MediaRecorder 默认输出 webm；如果浏览器给了别的 mime，挑个合理扩展名 */
function mimeToExt(mime: string): string {
  if (/webm/i.test(mime)) return 'webm'
  if (/ogg/i.test(mime)) return 'ogg'
  if (/mp4/i.test(mime)) return 'mp4'
  if (/wav/i.test(mime)) return 'wav'
  if (/mp3/i.test(mime)) return 'mp3'
  return 'webm'
}
