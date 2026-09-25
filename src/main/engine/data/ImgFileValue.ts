import { FileValue } from './FileValue'
import type { ValueKind } from './Value'

/**
 * 图片文件传输子：FileValue 的子类，不额外携带任何字段。
 *
 * 存在意义纯粹是类型标记——OutputPort 可以声明 kind = 'img-file'，
 * 下游 InputPort 写 accepts: [ImgFileValue] 就能精确只接图片，
 * 而不是宽泛的 accepts: [FileValue] 来者不拒。
 */
export class ImgFileValue extends FileValue {
  static override readonly VALUE_NAME: ValueKind = 'img-file'
}
