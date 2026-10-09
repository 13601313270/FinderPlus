import { djb2 } from './hash'
import { Value, type ValueKind } from './Value'

/**
 * 集合传输子基类：一个 Value 里装 N 个同类子 Value。
 *
 * 解决的问题：文件夹节点一次产出 100 张图，下游 PDF 节点只需要一条 Edge
 * 就能收到全部图片，不用拖 100 条 Edge。
 *
 * 与现有 InputPort.multiple 机制的关系：
 * - multiple 解决的是「一个 InputPort 接多条 Edge 时如何合并值」
 * - CollectionValue 解决的是「一条 Edge 如何装多个值」
 * 两者正交、互补，不是替代关系。
 *
 * 不可变约束：继承 Value 的不可变铁律——items 是 readonly，构造后不改动。
 * 上游需要替换集合时，重新构造一个新的 CollectionValue 实例 commit 即可。
 *
 * null 语义（与现有子类保持一致）：
 * - new ImgFileCollectionValue()       → isNull=true  （上游根本没输出集合）
 * - new ImgFileCollectionValue([])     → isNull=false （上游输出了一个空集合）
 * - new ImgFileCollectionValue([...])  → isNull=false （正常）
 * 空集合 ≠ 没输出——下游节点可能需要区分两种语义。
 *
 * 指纹规则：基类从子类的静态 VALUE_NAME 取类型标签，统一算好——
 *   - null 值 → `${VALUE_NAME}:null`
 *   - 空数组 → `${VALUE_NAME}:${djb2('__empty__')}`
 *   - 有内容 → `${VALUE_NAME}:${buildCollectionFingerprint(items)}`
 * 跟 FileValue / JsonValue 的风格完全对齐，子类只需要声明 VALUE_NAME、
 * 调 super(items) 就完事，不用碰 fingerprint。
 *
 * @template T 子 Value 类型——比如 ImgFileCollectionValue 就是 CollectionValue<ImgFileValue>
 */
export abstract class CollectionValue<T extends Value> extends Value {
  /**
   * 子元素列表；undefined 表示 null 值。
   * 只读数组 + 构造时一次性赋值 → 不可变。
   */
  readonly items: readonly T[] | undefined

  /**
   * 集合整体指纹，基类构造时统一算好。
   * 子类声明 static VALUE_NAME 即可，不需要手动算 fingerprint。
   */
  readonly fingerprint: string

  constructor(items?: readonly T[]) {
    super(items === undefined)
    this.items = items

    // 从子类的静态 VALUE_NAME 取类型标签，统一算指纹
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const valueName = (this.constructor as any).VALUE_NAME as ValueKind | undefined
    if (!valueName) {
      throw new Error(`${this.constructor.name}: 子类必须声明 static readonly VALUE_NAME`)
    }

    this.fingerprint = this.isNull
      ? `${valueName}:null`
      : `${valueName}:${this.buildCollectionFingerprint(items!)}`
  }

  /**
   * 计算集合指纹的工具方法——所有子元素的 fingerprint 排序后拼接（|| 分隔），
   * 再 djb2 哈希一次。排序保证无序集合的语义稳定性——同一组文件、不同顺序 → 同一指纹。
   *
   * 基类构造时自动调用；子类一般不需要碰，除非要 override fingerprint 的格式。
   */
  protected buildCollectionFingerprint(items: readonly T[]): string {
    if (items.length === 0) return djb2('__empty__')
    const sorted = items.map(v => v.fingerprint).sort()
    const raw = sorted.join('||')
    return djb2(raw)
  }

  /**
   * 渲染层 tooltip 默认标签。
   * 子类可 override 成更具体的文案（如 "100 images" / "5 PDFs"）。
   */
  override get displayLabel(): string {
    if (this.isNull) return '(null)'
    if (this.items!.length === 0) return '(empty collection)'
    return `${this.items!.length} items`
  }
}
