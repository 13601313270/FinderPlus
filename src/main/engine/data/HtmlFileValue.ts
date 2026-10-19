import { FileValue } from './FileValue'
import type { ValueKind } from './Value'

/**
 * HTML 文件传输子：FileValue 的子类，不额外携带任何字段。
 *
 * 存在意义纯粹是类型标记——OutputPort 可以声明 kind = 'html-file'，
 * 下游 InputPort 写 accepts: [HtmlFileValue] 就能精确只接 HTML，
 * 而不是宽泛的 accepts: [FileValue] 来者不拒。
 */
export class HtmlFileValue extends FileValue {
  static override readonly VALUE_NAME: ValueKind = 'html-file'
}
