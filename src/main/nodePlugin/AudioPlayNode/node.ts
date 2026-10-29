import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { VideoFileValue } from '../../engine/data/VideoFileValue'
import { FileValue } from '../../engine/data/FileValue'
import { InputPort } from '../../engine/port/InputPort'
import { Node } from '../../engine/node/Node'

/**
 * 音频播放节点：接收 FileValue 子类（AudioFileValue / VideoFileValue / FileValue），
 * 渲染端用 <audio> 元素直接播放，支持进度条拖拽、暂停/继续等控制。
 *
 * 自身不持有任何业务状态（无文件持久化、无参数），saveState 只存 box。
 * 渲染端通过 node.onChanged() 订阅输入变化，从 audioInput.value 取文件重建 blob URL。
 */
export class AudioPlayNode extends Node {
  static readonly TYPE = 'audio-play'
  readonly type = AudioPlayNode.TYPE

  /**
   * 输入端口：accepts 三类文件 Value。
   * - AudioFileValue：音频文件（.mp3 / .wav / .m4a ...）
   * - VideoFileValue：视频文件（.mp4 / .mov ...）——<audio> 元素会自动只播音轨
   * - FileValue：兜底，任何文件都能接
   */
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

  constructor(id: string) {
    super(id)
    this.addInput(this.audioInput)
    this.setBox(160, 160)
  }

  /** 不接收外部文件拖入 */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void { /* 不处理 */ }

  /**
   * 上游值变化：只需 notifyChanged 让渲染端刷新。
   * 本节点不做任何计算，纯 UI 消费端口值。
   */
  inputPortReceiveValue(_ports: InputPort[]): void {
    this.notifyChanged()
    this.completeRun()
  }

  saveState(): Record<string, unknown> {
    return { ...super.saveState(), box: this.box }
  }

  readState(state: Record<string, unknown>): void {
    const box = state.box as [number, number] | undefined
    if (box !== undefined) {
      this.setBox(Math.round(box[0]), Math.round(box[1]))
    }
  }
}
