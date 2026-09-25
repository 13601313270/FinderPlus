import { FileValue } from './FileValue'

/**
 * TXT 文件传输子：FileValue 的子类，不额外携带任何字段。
 *
 * 存在意义纯粹是类型标记——OutputPort 可以声明 kind = 'txt-file'，
 * 下游 InputPort 写 accepts: ['txt-file'] 就能精确只接 TXT，
 * 而不是宽泛的 accepts: ['file'] 来者不拒。
 */
export class TxtFileValue extends FileValue {
  override readonly kind = 'txt-file' as const
}
