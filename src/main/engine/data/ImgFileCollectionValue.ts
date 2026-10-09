import { CollectionValue } from './CollectionValue'
import { ImgFileValue } from './ImgFileValue'
import type { ValueKind } from './Value'

/**
 * 图片文件集合传输子：一个 Edge 里装 N 个 ImgFileValue。
 *
 * 典型场景：FolderNode（图片文件夹）一次产出 100 张图，下游 PdfFromImgNode
 * 只需要接一条 Edge 就能拿到全部图片，不用拖 100 条 Edge。
 *
 * fingerprint 由 CollectionValue 基类统一计算，跟 ImgFileValue 自身的文件内容 hash 对齐。
 */
export class ImgFileCollectionValue extends CollectionValue<ImgFileValue> {
  static readonly VALUE_NAME: ValueKind = 'img-file-collection'

  constructor(items?: readonly ImgFileValue[]) {
    super(items)
  }

  override get displayLabel(): string {
    if (this.isNull) return '(null)'
    if (this.items!.length === 0) return '(empty image collection)'
    return `${this.items!.length} images`
  }
}
