/**
 * 传输子基类：节点输出端口流出、输入端口流入的数据。
 *
 * 三条铁律：
 * 1. 不可变：值一旦产生就不再改动（只读字段），缓存与脏标记比对都建立在这上面
 * 2. 自描述：每个值都知道自己的类型标签，端口靠它做兼容判断
 * 3. 不见字节：值本身不承载字节，字节由 File 这类对象自己持有
 */

/**
 * 类型标签：开放字符串，不是闭集。
 * 内置三种（number / string / file）只是约定俗成的名字，
 * 插件可以自己定义新的种类，不需要回头改动这里。
 */
export type ValueKind = string

/**
 * 引擎内置的类型标签清单。
 *
 * UI 侧（端口上的类型胶囊）要靠它给出多语言表述，所以把内置的这几种登记成常量数组：
 * 新增一种内置 Value 子类时，词条契约会因缺 key 在 typecheck 阶段报错，逼着全部语言一起补。
 *
 * 但 ValueKind 本身仍是开放字符串——第三方插件自定义的种类不在这里，
 * UI 遇到清单外的种类原样显示标识符即可，不需要回头改动这份清单。
 */
export const BUILTIN_VALUE_KINDS = [
  'bool',
  'number',
  'string',
  'json',
  'file',
  'txt-file',
  'img-file'
] as const

export type BuiltinValueKind = (typeof BUILTIN_VALUE_KINDS)[number]

export abstract class Value {
  /**
   * 类级别的 Value 类型标签名：端口构造时直接从子类取 VALUE_NAME，
   * 不再手写字符串，编译期类型安全。
   */
  static readonly VALUE_NAME: ValueKind = ''

  /**
   * 是否为 null 值：上游显式 commit 的"这个类型下的空"。
   *
   * 与 port.value = []（端口没收到任何值）的 undefined 区分开——
   * null = 上游主动说"我传的是空"，undefined = 上游根本没传。
   *
   * 子类约定：构造函数 value 参数为可选，value 不传 → isNull 自动为 true。
   * 基类构造函数不传参，子类内部 super(value === undefined) 自动推导。
   */
  readonly isNull: boolean

  /**
   * 内容指纹：构造时算好的不可变字段，内容相同则指纹相同。
   * 上游靠它判断「我这次重算后到底有没有变」，端口靠它决定要不要往派发；
   * 同时它也是执行缓存键的一部分。
   *
   * 指纹在 Value 构造时一次性生成，下游只做字符串比较，不触发任何重计算。
   */
  abstract readonly fingerprint: string

  /**
   * 渲染层可读的默认值标签。
   * 每个 Value 子类必须自己实现，把内部值转成人类可读的短文本。
   * isNull 状态下统一显示 "(null)"。
   */
  abstract get displayLabel(): string

  /**
   * @param isNull 由子类内部根据"value 是否 undefined"传入，外部不要直接用。
   */
  constructor(isNull: boolean) {
    this.isNull = isNull
  }
}
