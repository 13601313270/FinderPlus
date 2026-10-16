import { FileValue } from './FileValue'
import type { ValueKind } from './Value'

/**
 * 音频文件传输子：FileValue 的子类，不额外携带任何字段。
 *
 * 存在意义纯粹是类型标记——OutputPort 可以声明 kind = 'audio-file'，
 * 下游 InputPort 写 accepts: [AudioFileValue] 就能精确只接音频。
 * 未来可扩展 AudioFileNode（类似 ImgFileNode）来支撑"从磁盘拖入音频"场景。
 */
export class AudioFileValue extends FileValue {
  static override readonly VALUE_NAME: ValueKind = 'audio-file'
}
