import { FileCollectionValue } from './FileCollectionValue'
import { AudioFileValue } from './AudioFileValue'
import type { ValueKind } from './Value'

/**
 * 音频文件集合传输子：一个 Edge 里装 N 个 AudioFileValue。
 *
 * 典型场景：AudioFolderNode（音频文件夹）一次产出 100 个音频文件，
 * 下游节点只需要接一条 Edge 就能拿到全部音频，不用拖 100 条 Edge。
 *
 * 继承链：AudioFileCollectionValue → FileCollectionValue → CollectionValue → Value
 * fingerprint 由 CollectionValue 基类统一计算，跟 AudioFileValue 自身的文件内容 hash 对齐。
 */
export class AudioFileCollectionValue extends FileCollectionValue<AudioFileValue> {
  static readonly VALUE_NAME: ValueKind = 'audio-file-collection'

  constructor(items?: readonly AudioFileValue[]) {
    super(items)
  }

  override get displayLabel(): string {
    if (this.isNull) return '(null)'
    if (this.items!.length === 0) return '(empty audio collection)'
    return `${this.items!.length} audio files`
  }
}
