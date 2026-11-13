import { FileValue } from '../../engine/data/FileValue'
import { InputPort } from '../../engine/port/InputPort'
import { FolderNode, type FileNodeClass } from './node'

/**
 * 通用文件夹节点：FolderNode 的默认具体实现，收纳任意文件节点。
 *
 * FolderNode 只作为抽象基类提供容器能力，不直接实例化；
 * 画布上的「文件夹」节点由本类注册（type 沿用 'folder'，兼容既有存档）。
 */
export class OtherFolderNode extends FolderNode {
  static readonly TYPE = 'folder'
  readonly type: string = OtherFolderNode.TYPE

  /** 输入端口：接受任意文件值（FileValue 子类均可） */
  readonly fileInput = new InputPort('file', {
    accepts: [FileValue],
    label: {
      zh: '文件',
      en: 'File',
      ja: 'ファイル',
      ko: '파일',
      es: 'Archivo',
      ar: 'ملف',
      fr: 'Fichier',
      pt: 'Arquivo',
      ru: 'Файл',
      hi: 'फ़ाइल',
      id: 'Berkas',
      de: 'Datei',
      vi: 'Tệp',
      tr: 'Dosya',
      it: 'File'
    }
  })

  /** 收纳范围：空数组表示不限制，任意 FileNode 子类都可收纳 */
  protected readonly acceptedFileNodeClasses: readonly FileNodeClass[] = []

  constructor(id: string) {
    super(id)
    this.addInput(this.fileInput)
  }
}
