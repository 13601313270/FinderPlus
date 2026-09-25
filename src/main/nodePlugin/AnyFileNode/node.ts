import { FileNode } from '../FileNode/node'

/**
 * 兜底文件节点：承接所有未被具体文件节点（如 TxtFileNode）命中的后缀。
 * 本身不定义任何端口，只做文件"占位 + 管理"用途，
 * 让画板可以作为一个文件管理器使用。
 */
export class AnyFileNode extends FileNode {
  static readonly TYPE = 'any-file'

  /** 任何后缀都接（注册时放在 nodeManifests 末尾，天然最后执行） */
  static override acceptsExtension(_ext: string): boolean {
    return true
  }

  readonly type = AnyFileNode.TYPE

  constructor(id: string) {
    super(id)
  }
}
