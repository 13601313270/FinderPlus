import { StringValue } from '../../engine/data/StringValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'

/**
 * 文件节点抽象基类：管理"已选中的文件"这一层共同状态。
 *
 * 子类需要自己声明：
 * - type（节点类型标识，如 'txt-file'）
 * - static acceptsExtension(ext): boolean —— 判断本节点类是否承接给定后缀。
 *   后缀已经过 resolveByExtension 归一化（小写、以点开头，如 '.txt'），
 *   子类直接按自己的规则返回 true/false 即可。
 * - 输出端口形状（不同文件类型输出不同 Value：txt 输出 StringValue，
 *   图片输出 FileValue 等）。基类统一提供 pathOutput（文件绝对路径，string），
 *   所有文件节点共用；其余业务端口由子类自己声明，并在构造时
 *   `this.addOutput(this.pathOutput)` 把路径端口挂上（挂在末尾，端口顺序更自然）
 * - 子类自己的值 commit 逻辑（放 render.vue 或子类自身的业务方法里，
 *   基类不依赖任何 preload API，保持对渲染端透明）
 *
 * 文件选择动作在 render.vue 里完成（渲染端有 window.fileApi preload），
 * 选好后调基类的 setFile 把文件名写回节点，基类负责持久化 fileName、
 * 并触发 notifyChanged。子类的业务层（如读文件内容、commit 输出端口）
 * 由 render.vue 在 setFile 之后串联调用。
 */
export abstract class FileNode extends Node {
  /** 判断是否承接给定后缀。子类 override 实现自己的匹配逻辑；默认 false 不接任何 */
  static acceptsExtension(_ext: string): boolean {
    return false
  }

  /** 当前已选文件名（相对于画布目录）；空串表示未选 */
  protected fileNameValue = ''

  /** 文件字节大小；未选时为 0 */
  protected fileSizeValue = 0

  /** 文件路径输出：画布目录下的绝对路径（string），所有文件节点共用 */
  readonly pathOutput = new OutputPort('path', StringValue, '路径')

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
    void this.commitPath()
    this.notifyChanged()
  }

  /**
   * 把文件绝对路径 commit 到 pathOutput。
   * 文件名的相对路径要经主进程拼成绝对路径（渲染端拿不到真实磁盘路径），
   * 所以是异步的；等待期间文件名若又被改（重新选文件），过期结果直接丢弃。
   */
  async commitPath(): Promise<void> {
    const fileName = this.fileNameValue
    if (!fileName) {
      this.pathOutput.commit(new StringValue(''))
      return
    }
    try {
      // @ts-ignore — 同 beforeDestroy：tsconfig.node.json 编译本文件时不带 preload 的 Window 扩展，
      // 但运行时本文件只在 renderer 里执行，window.fileApi 一定存在
      const fullPath = await window.fileApi.getFullPath(fileName)
      if (fileName !== this.fileNameValue) return
      this.pathOutput.commit(new StringValue(fullPath))
    } catch (err) {
      console.warn('[FileNode] 解析文件路径失败：', fileName, err)
    }
  }

  /**
   * 拖入文件落点命中本节点时被调用。基类默认不劫持；
   * 子类（如文件内容接收节点）想接管拖入文件时 override 为接收逻辑即可。
   * @param fileName 拖入文件的文件名（相对于画布目录）
   * @param size 文件字节大小
   * @returns 是否成功接收文件（true 会触发 setFile 写回节点）
   */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  /** 拖入文件 drop 提交。基类不劫持任何文件；子类想接管时 override 为接收逻辑即可。 */
  onFileDrop(_sourcePath: string): void {
    // 默认不处理
  }

  inputPortReceiveValue(_ports: InputPort[]): void {}

  saveState(): Record<string, unknown> {
    return { fileName: this.fileNameValue, fileSize: this.fileSizeValue }
  }

  readState(state: Record<string, unknown>): void {
    const name = typeof state.fileName === 'string' ? state.fileName : ''
    if (!name) return
    // 只恢复文件名和大小；内容由 render.vue 挂载时发现 fileName 存在后自动读回
    this.fileNameValue = name
    const size = typeof state.fileSize === 'number' ? state.fileSize : 0
    this.fileSizeValue = size
    // 恢复后补一次路径 commit：边重建时 EdgeBinder 会把端口当前值补给下游
    void this.commitPath()
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
