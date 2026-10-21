import { FileValue } from './FileValue'
import type { ValueKind } from './Value'

/**
 * 视频文件传输子：FileValue 的子类，不额外携带任何字段。
 *
 * 存在意义纯粹是类型标记——OutputPort 可以声明 kind = 'video-file'，
 * 下游 InputPort 写 accepts: [VideoFileValue] 就能精确只接视频。
 */
export class VideoFileValue extends FileValue {
  static override readonly VALUE_NAME: ValueKind = 'video-file'
}
