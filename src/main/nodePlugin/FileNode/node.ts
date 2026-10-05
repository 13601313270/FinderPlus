import { StringValue } from '../../engine/data/StringValue'
import { FileValue } from '../../engine/data/FileValue'
import { bytesToBase64 } from '../../engine/data/base64'
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
 * - 文件数据输入端口：accepts 用子类自己的文件 Value 类型声明一个 InputPort
 *   （如 TxtFileNode 用 TxtFileValue），再在构造时 `this.bindFileInput(port)` 注册。
 *   基类据此统一处理"收到文件 → 删旧副本 → 新文件落盘 → 重读内容"的替换流程
 * - reloadFileContent()：文件被替换后重读内容并 commit 业务端口；
 *   基类空实现，需要重读的子类 override
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
  readonly pathOutput = new OutputPort('path', StringValue, {
    zh: '路径',
    en: 'Path',
    ja: 'パス',
    ko: '경로',
    es: 'Ruta',
    ar: 'مسار',
    fr: 'Chemin',
    pt: 'Caminho',
    ru: 'Путь',
    hi: 'पथ',
    id: 'Jalur',
    de: 'Pfad',
    vi: 'Đường dẫn',
    tr: 'Yol',
    it: 'Percorso'
  })

  /** 文件数据输入端口。accepts 因文件类型而异，由子类声明后经 bindFileInput 注册 */
  protected fileInputPort: InputPort | undefined

  /** 文件被输入端口替换的次数。同名文件替换时 fileName 不变，UI 靠它感知内容已换 */
  private fileRevisionValue = 0

  constructor(id: string) {
    super(id)
  }

  get fileName(): string {
    return this.fileNameValue
  }

  get fileRevision(): number {
    return this.fileRevisionValue
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

  inputPortReceiveValue(ports: InputPort[]): void {
    const input = this.fileInputPort
    if (!input || !ports.includes(input)) return
    const [value] = input.value
    if (value instanceof FileValue && !value.isNull) {
      void this.replaceFile(value.file!)
    }
  }

  /**
   * 子类构造时把自己的文件输入端口注册进来。
   * accepts 用子类对应的文件 Value 类型（如图片节点用 ImgFileValue），
   * 这样只有同类型文件才能连上——类型约束由端口校验负责，节点内部不再重复判断。
   */
  protected bindFileInput(port: InputPort): void {
    this.fileInputPort = port
    this.addInput(port)
  }

  /**
   * 用新文件替换本节点当前文件：先删掉画布目录里的旧副本，再把新 File 落盘并挂上。
   * 落盘后交给 reloadFileContent 重读内容并 commit 业务端口。
   */
  async replaceFile(file: File): Promise<void> {
    try {
      const previousName = this.fileNameValue
      if (previousName) {
        try {
          // @ts-ignore — 见 commitPath 的说明：只在 renderer 里执行，window.fileApi 一定存在
          await window.fileApi.delete(previousName)
        } catch (err) {
          // 旧副本可能已被用户手动删了，不影响替换
          console.warn('[FileNode] 删除旧文件失败：', previousName, err)
        }
      }

      const base64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()))
      // @ts-ignore
      const { fileName, size } = await window.fileApi.writeBuffer(file.name, base64)

      // 直接写字段而不走 setFile：新旧文件同名时 setFile 会提前 return，状态刷不出来
      this.fileNameValue = fileName
      this.fileSizeValue = size
      this.fileRevisionValue += 1
      void this.commitPath()
      this.notifyChanged()

      await this.reloadFileContent()
    } catch (err) {
      console.warn('[FileNode] 替换文件失败：', file.name, err)
    }
  }

  /**
   * 新文件已落到磁盘后，子类重读内容并 commit 自己的业务端口。
   * 基类默认什么都不做，需要重读内容的子类（txt / 图片 / 通用文件）override。
   */
  async reloadFileContent(): Promise<void> {}

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
