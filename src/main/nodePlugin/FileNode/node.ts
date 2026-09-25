import { Node } from '../../engine/node/Node'

/**
 * 文件节点抽象基类：管理"已选中的文件"这一层共同状态。
 *
 * 子类需要自己声明：
 * - type（节点类型标识，如 'txt-file'）
 * - static acceptsExtension(ext): boolean —— 判断本节点类是否承接给定后缀。
 *   后缀已经过 resolveByExtension 归一化（小写、以点开头，如 '.txt'），
 *   子类直接按自己的规则返回 true/false 即可。
 * - static isFallback?: boolean —— 兜底节点设为 true。resolveByExtension
 *   先走一遍非兜底节点，没命中再走兜底，确保具体节点优先。
 * - 输出端口形状（不同文件类型输出不同 Value：txt 输出 StringValue，
 *   图片输出 FileValue 等，基类不定义端口）
 * - 子类自己的值 commit 逻辑（放 render.vue 或子类自身的业务方法里，
 *   基类不依赖任何 preload API，保持对渲染端透明）
 *
 * 文件选择动作在 render.vue 里完成（渲染端有 window.fileApi preload），
 * 选好后调基类的 setFile 把文件名写回节点，基类负责持久化 fileName、
 * 并触发 notifyChanged。子类的业务层（如读文件内容、commit 输出端口）
 * 由 render.vue 在 setFile 之后串联调用。
 */
export abstract class FileNode extends Node {
  /** 是否为兜底节点（兜底节点在 resolveByExtension 里排第二轮） */
  static isFallback: boolean = false

  /** 判断是否承接给定后缀。子类 override 实现自己的匹配逻辑；默认 false 不接任何 */
  static acceptsExtension(_ext: string): boolean {
    return false
  }

  /** 当前已选文件名（相对于画布目录）；空串表示未选 */
  protected fileNameValue = ''

  /** 文件字节大小；未选时为 0 */
  protected fileSizeValue = 0

  constructor(id: string) {
    super(id)
  }

  get fileName(): string {
    return this.fileNameValue
  }

  get fileSize(): number {
    return this.fileSizeValue
  }

  /** 是否已选中文件（fileName 非空才算选中）。用于判断是否启用"拖出外部"能力 */
  get hasFile(): boolean {
    return this.fileNameValue.length > 0
  }

  /** 写入已选文件状态。render.vue 调完 IPC 后用这个回写节点 */
  setFile(fileName: string, fileSize: number): void {
    if (fileName === this.fileNameValue) return
    this.fileNameValue = fileName
    this.fileSizeValue = fileSize
    this.notifyChanged()
  }

  onInputChanged(): void {}

  saveState(): Record<string, unknown> {
    return { fileName: this.fileNameValue }
  }

  readState(state: Record<string, unknown>): void {
    const name = typeof state.fileName === 'string' ? state.fileName : ''
    if (!name) return
    // 只恢复文件名；内容由 render.vue 挂载时发现 fileName 存在后自动读回
    this.fileNameValue = name
  }

  /**
   * 删除节点前：把画布目录里的文件副本也清掉，不留垃圾。
   * 空文件不调 IPC，省一次开销。
   */
  async beforeDestroy(): Promise<void> {
    if (this.fileNameValue) {
      try {
        // @ts-ignore — tsconfig.node.json 编译本文件时不把 preload 的 Window 扩展带进来，
        // 但运行时本文件只在 renderer 里执行，window.fileApi 一定存在
        await window.fileApi.delete(this.fileNameValue)
      } catch (err) {
        // 文件可能已被用户手动删了，静默忽略——节点本身还是要删的
        console.warn('[FileNode] 删除文件失败：', this.fileNameValue, err)
      }
    }
  }
}
