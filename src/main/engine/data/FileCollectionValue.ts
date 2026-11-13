import { CollectionValue } from './CollectionValue'
import { FileValue } from './FileValue'

/**
 * 文件集合传输子中间层：一个 CollectionValue 里装 N 个 FileValue 子类。
 *
 * 存在意义：让下游可以用 `instanceof FileCollectionValue` 宽泛匹配
 * 「任意文件集合」而不必枚举所有具体集合类型；同时也为未来扩展
 * （如 PdfFileCollectionValue / VideoFileCollectionValue）提供统一父类。
 *
 * 不携带额外字段，完全复用 CollectionValue 的 fingerprint / items 逻辑。
 *
 * @template T 文件子类型——比如 ImgFileCollectionValue 就是 FileCollectionValue<ImgFileValue>
 */
export abstract class FileCollectionValue<T extends FileValue> extends CollectionValue<T> {}
