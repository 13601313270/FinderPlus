import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { PdfFileValue } from '../../engine/data/PdfFileValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { InputPort } from '../../engine/port/InputPort'
import { FileNode } from '../FileNode/node'

/** PDF 后缀集合，供 acceptsExtension 使用 */
const ACCEPTED_EXTS = new Set(['.pdf'])

/** 卡片默认宽度（世界像素）——预览区按 PDF 页面比例，高度随宽度推导 */
export const DEFAULT_PREVIEW_WIDTH = 200
/** 卡片最小宽度（用户拖 handle 不能再缩小） */
export const MIN_PREVIEW_WIDTH = 100
/** 卡片最大宽度（用户拖 handle 封顶） */
export const MAX_PREVIEW_WIDTH = 800

/**
 * 卡片固定垂直开销：flex-gap + padding + 文件名行 ≈ 40px
 * 预览区高度 = boxWidth / PDF 页面宽高比
 */
const CARD_VERTICAL_OVERHEAD = 40

export class PdfFileNode extends FileNode {
  static readonly TYPE = 'pdf-file'

  static override acceptsExtension(ext: string): boolean {
    return ACCEPTED_EXTS.has(ext)
  }

  readonly type = PdfFileNode.TYPE

  /** PDF 第一页天然宽度（像素）。render.vue 的 pdfjs 加载后回写；0 表示尚未加载 */
  private pageWidthValue = 0
  /** PDF 第一页天然高度（像素）。render.vue 的 pdfjs 加载后回写；0 表示尚未加载 */
  private pageHeightValue = 0

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
    it: 'Scrivi dati'
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
    // 宽度走基类 box（用户可拖 handle 调）；高度维 0 = 不约束，随 PDF 页面比例撑开
    this.setBox(DEFAULT_PREVIEW_WIDTH, 0)
  }

  /** 文件被输入端口替换后：重读新 PDF 二进制并 commit fileOutput */
  override async reloadFileContent(): Promise<void> {
    if (!this.fileName) return
    try {
      // @ts-ignore — 只在 renderer 里执行，window.fileApi 一定存在
      const base64 = await window.fileApi.readBinary(this.fileName)
      this.setContent(base64)
      // 换了文件，旧页面尺寸作废；新尺寸由 render.vue 的 pdfjs 加载回写
      this.pageWidthValue = 0
      this.pageHeightValue = 0
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

  /** 当前 PDF 第一页天然宽度（pdf 单位）；0 表示尚未加载 */
  get pageWidth(): number { return this.pageWidthValue }
  /** 当前 PDF 第一页天然高度（pdf 单位）；0 表示尚未加载 */
  get pageHeight(): number { return this.pageHeightValue }

  /**
   * 写入 PDF 第一页天然尺寸，由 render.vue 的 pdfjs getPage(1) 后回写。
   */
  setPageSize(width: number, height: number): void {
    if (width === this.pageWidthValue && height === this.pageHeightValue) return
    this.pageWidthValue = width
    this.pageHeightValue = height
    this.recalcHeight()
  }

  /**
   * 根据当前 box 宽度和 PDF 页面天然比例，算出卡片需要的总高度并 setBox。
   * PDF 尚未加载（pageWidth=0）时跳过。
   *
   * 在两处被调：
   * 1. setPageSize（PDF 首次加载后）
   * 2. render.vue 的 resize handle 拖拽中（宽度变了，高度跟着按比例变）
   */
  recalcHeight(): void {
    const pw = this.pageWidthValue
    const ph = this.pageHeightValue
    if (!pw || !ph) return
    const w = this.box[0] || DEFAULT_PREVIEW_WIDTH
    const aspectRatio = pw / ph
    const iconHeight = w / aspectRatio
    this.setBox(w, Math.round(iconHeight + CARD_VERTICAL_OVERHEAD))
  }

  saveState(): Record<string, unknown> {
    return { ...super.saveState(), box: this.box }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)
    const box = state.box as [number, number]
    if (box !== undefined) {
      this.setBox(Math.min(MAX_PREVIEW_WIDTH, Math.max(MIN_PREVIEW_WIDTH, Math.round(box[0]))), box[1])
    }
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接管拖入文件
  }
}
