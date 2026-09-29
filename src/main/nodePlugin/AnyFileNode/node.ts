import { FileValue } from '../../engine/data/FileValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { FileNode } from '../FileNode/node'

/**
 * 兜底文件节点：承接所有未被具体文件节点（如 TxtFileNode）命中的后缀。
 *
 * - fileOutput：FileValue（通用文件类型，kind = 'file'），
 *   下游接 'file' 类型的节点都能连上
 */
export class AnyFileNode extends FileNode {
  static readonly TYPE = 'any-file'

  /** 任何后缀都接（注册时放在 nodeManifests 末尾，天然最后执行） */
  static override acceptsExtension(_ext: string): boolean {
    return true
  }

  readonly type = AnyFileNode.TYPE

  /** 文件输出（FileValue，kind = 'file'） */
  readonly fileOutput = new OutputPort('file', FileValue, '文件')

  constructor(id: string) {
    super(id)
    this.addOutput(this.fileOutput)
    // 基类共用的路径端口（文件绝对路径），挂在末尾
    this.addOutput(this.pathOutput)
    // 内容区硬约束：文件图标 72px + 文件名行 + padding ≈ 122px 高，宽 180px
    this.setBox(180, 122)
  }
}
