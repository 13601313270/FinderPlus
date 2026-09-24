import { Node } from '../../engine/node/Node'

/**
 * 文件节点抽象基类：管理"已选中的文件"这一层共同状态。
 *
 * 子类需要自己声明：
 * - type（节点类型标识，如 'txt-file'）
 * - static EXTENSIONS: readonly string[]（如 ['.txt']）—— 声明本节点类承接哪些文件后缀，
 *   用于拖拽分发：App.vue 根据拖入文件的后缀，反查哪个 FileNode 子类来承接。
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
  /** 本节点类承接的文件后缀列表（子类必须覆盖为非空数组） */
  static readonly EXTENSIONS: readonly string[] = []

  /** 当前已选文件名（相对于画布目录）；空串表示未选 */
  protected fileNameValue = ''

  /** 文件字节大小；未选时为 0 */
  protected fileSizeValue = 0

  constructor(id: string) {
    super(id)
  }

  /** 实例方法：返回本节点类承接的后缀列表，转发到静态 EXTENSIONS */
  getAcceptedExtensions(): string[] {
    return [...(this.constructor as typeof FileNode).EXTENSIONS]
  }

  get fileName(): string {
    return this.fileNameValue
  }

  get fileSize(): number {
    return this.fileSizeValue
  }

  /** 写入已选文件状态。render.vue 调完 IPC 后用这个回写节点 */
  setFile(fileName: string, fileSize: number): void {
    if (fileName === this.fileNameValue) return
    this.fileNameValue = fileName
    this.fileSizeValue = fileSize
    this.notifyChanged()
  }

  clearFile(): void {
    if (!this.fileNameValue) return
    this.fileNameValue = ''
    this.fileSizeValue = 0
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
}
