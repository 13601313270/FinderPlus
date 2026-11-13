import { FolderNode } from './node'

/**
 * 通用文件夹节点：FolderNode 的默认具体实现，收纳任意文件节点。
 *
 * FolderNode 只作为抽象基类提供容器能力，不直接实例化；
 * 画布上的「文件夹」节点由本类注册（type 沿用 'folder'，兼容既有存档）。
 */
export class OtherFolderNode extends FolderNode {
  static readonly TYPE = 'folder'
  readonly type: string = OtherFolderNode.TYPE
}
