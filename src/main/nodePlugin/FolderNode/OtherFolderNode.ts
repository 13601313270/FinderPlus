import { OutputPort } from '../../engine/port/OutputPort'
import { FileValue } from '../../engine/data/FileValue'
import { InputPort } from '../../engine/port/InputPort'
import { FileCollectionNodeClass, FolderNode, type FileNodeClass } from './node'
import { MixFileCollectionValue } from '../../engine/data/mixFileCollectionValue'

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

  /** 输出端口：当前选中子文件的 FileValue。无选中项时调 fileSelectOutput.clear() 让下游清空。 */
  readonly fileSelectOutput = new OutputPort('file-select', FileValue, {
    zh: '选中文件',
    en: 'Selected File',
    ja: '選択したファイル',
    ko: '선택한 파일',
    es: 'Archivo seleccionado',
    ar: 'ملف المحددة',
    fr: 'Fichier sélectionné',
    pt: 'Arquivo selecionado',
    ru: 'Выбранный файл',
    hi: 'चयनित छवि',
    id: 'Berkas Terpilih',
    de: 'Ausgewähltes Datei',
    vi: 'Tệp đã chọn',
    tr: 'Seçili Dosya',
    it: 'File selezionato'
  })

  readonly FileCollectionNodeClasses: FileCollectionNodeClass = MixFileCollectionValue

  /** 集合输出端口：全部子文件组成的 MixFileCollectionValue */
  readonly collectionOutput = new OutputPort('collection', this.FileCollectionNodeClasses, {
    zh: '全部文件',
    en: 'All Files',
    ja: 'すべての画像',
    ko: '모든 이미지',
    es: 'Todas las imágenes',
    ar: 'جميع الصور',
    fr: 'Toutes les images',
    pt: 'Todas as imagens',
    ru: 'Все файлы',
    hi: 'सभी छवियां',
    id: 'Semua File',
    de: 'Alle Dateien',
    vi: 'Tất cả file',
    tr: 'Tüm Görseller',
    it: 'Tutte le file'
  })

  /** 收纳范围：空数组表示不限制，任意 FileNode 子类都可收纳 */
  protected readonly acceptedFileNodeClasses: readonly FileNodeClass[] = []

  constructor(id: string) {
    super(id)
    this.addInput(this.fileInput)
    this.addOutput(this.fileSelectOutput)
    this.addOutput(this.collectionOutput)
  }
}
