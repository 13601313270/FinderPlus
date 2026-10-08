import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { PdfFileValue } from '../../engine/data/PdfFileValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { InputPort } from '../../engine/port/InputPort'
import { FileNode } from '../FileNode/node'

/** PDF 后缀集合，供 acceptsExtension 使用 */
const ACCEPTED_EXTS = new Set(['.pdf'])

/** 卡片固定尺寸：PDF 不需要预览图，图标区 + 文件名行 + padding ≈ 122px 高 */
const CARD_WIDTH = 180
const CARD_HEIGHT = 122

/**
 * PDF 文件节点：选中 .pdf 文件后由渲染端读取二进制，
 * 节点负责构造 PdfFileValue 并从 fileOutput 送出。
 *
 * 与 ImgFileNode 的差异：
 * - PDF 不做内嵌预览（不需要 pdf.js），只展示 PDF 文件图标 + 文件名 + 大小
 * - 只有单 fileOutput（PdfFileValue，kind = 'pdf-file'）+ 基类 pathOutput
 */
export class PdfFileNode extends FileNode {
  static readonly TYPE = 'pdf-file'

  static override acceptsExtension(ext: string): boolean {
    return ACCEPTED_EXTS.has(ext)
  }

  readonly type = PdfFileNode.TYPE

  /** 文件输出（PdfFileValue，kind = 'pdf-file'） */
  readonly fileOutput = new OutputPort('file', PdfFileValue, {
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

  /** 文件数据输入端口：只接受同类型（PDF）文件，收到值即替换本节点文件 */
  readonly fileInput = new InputPort('file-in', {
    accepts: [PdfFileValue],
    label: {
      zh: '写入数据',
      en: 'Write Data',
      ja: 'データを書き込む',
      ko: '데이터 쓰기',
      es: 'Escribir datos',
      ar: 'كتابة البيانات',
      fr: 'Écrire des données',
      pt: 'Gravar dados',
      ru: 'Запись данных',
      hi: 'डेटा लिखें',
      id: 'Tulis Data',
      de: 'Daten schreiben',
      vi: 'Ghi dữ liệu',
      tr: 'Veri yaz',
      it: 'Scrivi dati'
    }
  })

  constructor(id: string) {
    super(id)
    this.addOutput(this.fileOutput)
    // 基类共用的路径端口（文件绝对路径），挂在末尾
    this.addOutput(this.pathOutput)
    this.bindFileInput(this.fileInput)
    this.setBox(CARD_WIDTH, CARD_HEIGHT)
  }

  /** 文件被输入端口替换后：重读新 PDF 二进制并 commit fileOutput */
  override async reloadFileContent(): Promise<void> {
    if (!this.fileName) return
    try {
      // @ts-ignore — 只在 renderer 里执行，window.fileApi 一定存在
      const base64 = await window.fileApi.readBinary(this.fileName)
      this.setContent(base64)
    } catch (err) {
      console.warn('[PdfFileNode] 读取替换后的文件失败：', this.fileName, err)
    }
  }

  /**
   * 写入 PDF 二进制内容并 commit fileOutput。
   * 由 render.vue 在读完文件后调用（选文件按钮点击、或持久化恢复时自动读回）。
   *
   * @param base64  文件二进制的 base64 编码（由 fileApi.readBinary 返回）
   */
  setContent(base64: string): void {
    if (!this.fileName) return
    const bytes = base64ToBytes(base64)
    // 显式取 slice 后的纯 ArrayBuffer，避免 Uint8Array<ArrayBufferLike> 卡在 File 构造上
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const file = new File([ab], this.fileName, { type: 'application/pdf' })
    const hash = djb2(base64)
    this.fileOutput.commit(new PdfFileValue(file, hash))
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    return { ...super.saveState(), box: this.box }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)
    const box = state.box as [number, number]
    if (box !== undefined) {
      this.setBox(CARD_WIDTH, box[1] || CARD_HEIGHT)
    }
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接管拖入文件
  }
}
