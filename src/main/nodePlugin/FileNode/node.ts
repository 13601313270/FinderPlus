import { Node } from '../../engine/node/Node'

/**
 * 文件节点抽象基类：管理"已选中的文件"这一层共同状态。
 *
 * 子类需要自己声明：
 * - type（节点类型标识，如 'txt-file'）
 * - getAcceptedExtensions()：原生对话框接受的扩展名（如 ['.txt']）
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
  /** 当前已选文件名（相对于画布目录）；空串表示未选 */
  protected fileNameValue = ''

  /** 文件字节大小；未选时为 0 */
  protected fileSizeValue = 0

  /** 原生对话框接受的扩展名列表，子类声明 */
  abstract getAcceptedExtensions(): string[]

  constructor(id: string) {
    super(id)
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
