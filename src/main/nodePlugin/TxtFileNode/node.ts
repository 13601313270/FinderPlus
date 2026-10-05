import { bytesToBase64 } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { TxtFileValue } from '../../engine/data/TxtFileValue'
import { StringValue } from '../../engine/data/StringValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { InputPort } from '../../engine/port/InputPort'
import { FileNode } from '../FileNode/node'

/**
 * TXT 文件节点：选中 .txt 文件后由渲染端读取内容，节点负责持有内容并从两个输出端口送出。
 *
 * - contentOutput：文本内容（string），跟 TextInputNode 的 textOutput 同形状，
 *   下游任何接 string 的节点都能直接接上
 * - fileOutput：TxtFileValue（FileValue 子类，kind = 'txt-file'），
 *   下游接 'txt-file' 或 'file' 类型的节点都能连上
 */
export class TxtFileNode extends FileNode {
  static readonly TYPE = 'txt-file'

  static override acceptsExtension(ext: string): boolean {
    return ext === '.txt'
  }

  readonly type = TxtFileNode.TYPE

  /** 文本内容输出（string） */
  readonly contentOutput = new OutputPort('content', StringValue, {
    zh: '文本',
    en: 'Text',
    ja: 'テキスト',
    ko: '텍스트',
    es: 'Texto',
    ar: 'نص',
    fr: 'Texte',
    pt: 'Texto',
    ru: 'Текст',
    hi: 'टेक्स्ट',
    id: 'Teks',
    de: 'Text',
    vi: 'Văn bản',
    tr: 'Metin',
    it: 'Testo'
  })

  /** 文件输出（TxtFileValue，kind = 'txt-file'） */
  readonly fileOutput = new OutputPort('file', TxtFileValue, {
    zh: '文件',
    en: 'File',
    ja: 'ファイル',
    ko: '파일',
    es: 'Archivo',
    ar: 'ملف',
    fr: 'Fichier',
    pt: 'Ficheiro',
    ru: 'Файл',
    hi: 'फ़ाइल',
    id: 'Berkas',
    de: 'Datei',
    vi: 'Tệp',
    tr: 'Dosya',
    it: 'File'
  })

  /** 文件数据输入端口：只接受同类型（txt）文件，收到值即替换本节点文件 */
  readonly fileInput = new InputPort('file-in', {
    accepts: [TxtFileValue],
    label: {
      zh: '文件',
      en: 'File',
      ja: 'ファイル',
      ko: '파일',
      es: 'Archivo',
      ar: 'ملف',
      fr: 'Fichier',
      pt: 'Ficheiro',
      ru: 'Файл',
      hi: 'फ़ाइल',
      id: 'Berkas',
      de: 'Datei',
      vi: 'Tệp',
      tr: 'Dosya',
      it: 'File'
    }
  })

  /** 文本内容输入端口：接收字符串，写入节点内容并同步到磁盘文件 */
  readonly contentInput = new InputPort('content-in', {
    accepts: [StringValue],
    label: {
      zh: '内容',
      en: 'Content',
      ja: '内容',
      ko: '내용',
      es: 'Contenido',
      ar: 'المحتوى',
      fr: 'Contenu',
      pt: 'Conteúdo',
      ru: 'Содержимое',
      hi: 'सामग्री',
      id: 'Konten',
      de: 'Inhalt',
      vi: 'Nội dung',
      tr: 'İçerik',
      it: 'Contenuto'
    }
  })

  /** 当前文本内容；空节点初始化为空串 */
  private contentValue = ''

  constructor(id: string) {
    super(id)
    this.addOutput(this.contentOutput)
    this.addOutput(this.fileOutput)
    // 基类共用的路径端口（文件绝对路径），挂在末尾
    this.addOutput(this.pathOutput)
    this.bindFileInput(this.fileInput)
    this.addInput(this.contentInput)
    // 内容区硬约束：文件图标 72px + 文件名行 + padding ≈ 122px 高，宽 180px
    this.setBox(180, 122)
  }

  /**
   * 输入端口收到值的统一入口。
   * FileNode 基类处理 fileInput（替换文件），这里新增 contentInput（写入文本内容）。
   */
  override inputPortReceiveValue(ports: InputPort[]): void {
    // 基类逻辑：fileInput 收到文件 → 替换
    super.inputPortReceiveValue(ports)

    // 新增逻辑：contentInput 收到字符串 → 更新内容并落盘
    if (ports.includes(this.contentInput)) {
      const [value] = this.contentInput.value
      if (value instanceof StringValue && !value.isNull) {
        void this.applyContent(value.value!)
      }
    }
  }

  /**
   * 把字符串写入节点内容，并在有 fileName 时同步落盘。
   */
  private async applyContent(text: string): Promise<void> {
    this.setContent(text)
    if (!this.fileName) return
    try {
      // @ts-ignore — 只在 renderer 里执行，window.fileApi 一定存在
      const base64 = bytesToBase64(new TextEncoder().encode(text))
      // @ts-ignore
      const result = await window.fileApi.writeBuffer(this.fileName, base64, true)
      this.fileSizeValue = result.size
      this.notifyChanged()
    } catch (err) {
      console.warn('[TxtFileNode] 写入磁盘文件失败：', this.fileName, err)
    }
  }

  /** 文件被输入端口替换后：重读新文件内容并 commit 端口 */
  override async reloadFileContent(): Promise<void> {
    if (!this.fileName) return
    try {
      // @ts-ignore — 只在 renderer 里执行，window.fileApi 一定存在
      const text = await window.fileApi.readText(this.fileName)
      this.setContent(text)
    } catch (err) {
      console.warn('[TxtFileNode] 读取替换后的文件失败：', this.fileName, err)
    }
  }

  /** 节点对外暴露的文本内容 */
  get content(): string {
    return this.contentValue
  }

  /**
   * 写入内容并 commit 两个输出端口。
   * 由 render.vue 在读完文件后调用（选文件按钮点击、或持久化恢复时自动读回）。
   */
  setContent(text: string): void {
    if (text === this.contentValue) return
    this.contentValue = text
    this.contentOutput.commit(new StringValue(text))

    // 构造 TxtFileValue：用文本内容 new File + djb2 算 hash
    if (this.fileName) {
      const file = new File([text], this.fileName, { type: 'text/plain;charset=utf-8' })
      const hash = djb2(text)
      this.fileOutput.commit(new TxtFileValue(file, hash))
    }

    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    return { ...super.saveState(), content: this.contentValue }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)
    const text = typeof state.content === 'string' ? state.content : ''
    if (text) {
      this.contentValue = text
      this.contentOutput.commit(new StringValue(text))
      // 持久化恢复时 fileName 已由 super.readState 恢复，构造 TxtFileValue commit
      if (this.fileName) {
        const file = new File([text], this.fileName, { type: 'text/plain;charset=utf-8' })
        const hash = djb2(text)
        this.fileOutput.commit(new TxtFileValue(file, hash))
      }
    }
  }
}
