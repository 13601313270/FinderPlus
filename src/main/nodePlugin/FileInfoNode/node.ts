import { FileValue } from '../../engine/data/FileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/**
 * 文件信息展示节点：把上游送来的 FileValue 的元信息（name / size / type）显示出来，
 * 并通过输出端口把文件大小（KB）和文件类型（MIME）派发给下游节点。
 *
 * 输入端口 accepts 只列 FileValue，因为 FileValue 本身就能接住所有子类
 * （canBindEdge 用 prototype instanceof 检查，TxtFileValue 是 FileValue 子类，
 * 能被 [FileValue] 接受，无需重复声明）。
 */
export class FileInfoNode extends Node {
  static readonly TYPE = 'file-info'
  readonly type = FileInfoNode.TYPE

  /** 输入端口：接受 FileValue 及其所有子类（如 TxtFileValue） */
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

  /** 输出端口：文件大小（KB） */
  readonly sizeOutput = new OutputPort('number', NumberValue, {
    zh: '文件大小（KB）',
    en: 'File Size (KB)',
    ja: 'ファイルサイズ（KB）',
    ko: '파일 크기(KB)',
    es: 'Tamaño del archivo (KB)',
    ar: 'حجم الملف (KB)',
    fr: 'Taille du fichier (KB)',
    pt: 'Tamanho do arquivo (KB)',
    ru: 'Размер файла (KB)',
    hi: 'फ़ाइल का आकार (KB)',
    id: 'Ukuran berkas (KB)',
    de: 'Dateigröße (KB)',
    vi: 'Kích thước tệp (KB)',
    tr: 'Dosya boyutu (KB)',
    it: 'Dimensione file (KB)'
  })

  /** 输出端口：文件 MIME 类型 */
  readonly typeOutput = new OutputPort('string', StringValue, {
    zh: '文件 MIME 类型',
    en: 'File MIME Type',
    ja: 'ファイルの MIME タイプ',
    ko: '파일 MIME 유형',
    es: 'Tipo MIME del archivo',
    ar: 'نوع MIME للملف',
    fr: 'Type MIME du fichier',
    pt: 'Tipo MIME do arquivo',
    ru: 'Тип MIME файла',
    hi: 'फ़ाइल MIME प्रकार',
    id: 'Jenis MIME berkas',
    de: 'MIME-Typ der Datei',
    vi: 'Loại MIME của tệp',
    tr: 'Dosya MIME türü',
    it: 'Tipo MIME del file'
  })

  private fileName = ''
  private fileSize = 0
  private fileType = ''

  constructor(id: string) {
    super(id)
    this.addInput(this.fileInput)
    this.addOutput(this.sizeOutput)
    this.addOutput(this.typeOutput)
    // 内容区硬约束：手柄 + 名称/大小/类型三行信息。信息多时在框内滚动
    this.setBox(200, 136)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 当前展示的文件名。没接输入、或上游还没算过时是空串 */
  get displayFileName(): string {
    return this.fileName
  }

  /** 当前展示的文件大小（字节） */
  get displayFileSize(): number {
    return this.fileSize
  }

  /** 当前展示的文件 MIME 类型 */
  get displayFileType(): string {
    return this.fileType
  }

  /** 收到通知就刷新展示，并把文件大小（KB）派发到输出端口 */
  inputPortReceiveValue(_ports: InputPort[]): void {
    const [first] = this.fileInput.value
    if (first instanceof FileValue) {
      this.fileName = first.file.name
      this.fileSize = first.file.size
      this.fileType = first.file.type
    } else {
      this.fileName = ''
      this.fileSize = 0
      this.fileType = ''
    }
    this.sizeOutput.commit(new NumberValue(Math.round(this.fileSize / 1024 * 100) / 100))
    this.typeOutput.commit(new StringValue(this.fileType))
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    // 都是上游派生出来的，恢复时上游 commit 会自动刷回来，不用存
    return {}
  }

  readState(_state: Record<string, unknown>): void {
    // 啥也不做——派生状态等上游恢复后自然会刷新
  }
}
