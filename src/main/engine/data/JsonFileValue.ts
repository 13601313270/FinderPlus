import { FileValue } from './FileValue'
import type { ValueKind } from './Value'

/**
 * JSON 文件传输子：FileValue 的子类，不额外携带任何字段。
 *
 * 存在意义纯粹是类型标记——OutputPort 可以声明 kind = 'json-file'，
 * 下游 InputPort 写 accepts: [JsonFileValue] 就能精确只接 JSON，
 * 而不是宽泛的 accepts: [FileValue] 来者不拒。
 */
export class JsonFileValue extends FileValue {
  static override readonly VALUE_NAME: ValueKind = 'json-file'
}
