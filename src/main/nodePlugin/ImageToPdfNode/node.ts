import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { PdfFileValue } from '../../engine/data/PdfFileValue'
import { ImgFileCollectionValue } from '../../engine/data/ImgFileCollectionValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/**
 * 预设页面尺寸（单位：PDF points，1pt = 1/72 英寸）。
 * 全部 portrait（纵向），用户可以通过 width/height setter 自由改。
 */
export const PAGE_SIZE_PRESETS: Record<string, { width: number; height: number }> = {
  A4:    { width: 595.28, height: 841.89 },
  A3:    { width: 841.89, height: 1190.55 },
  A5:    { width: 419.53, height: 595.28 },
  Letter:{ width: 612,    height: 792 },
  Legal: { width: 612,    height: 1008 }
}

export type PageSizePreset = keyof typeof PAGE_SIZE_PRESETS

/**
 * 图片在页面上的适配模式（类比 CSS object-fit）：
 * - contain: 等比缩放，完整显示，居中留白（默认，不变形）
 * - fill: 拉伸铺满页面，不保持宽高比（可能变形）
 * - cover: 等比缩放，铺满页面，裁剪溢出部分（无留白）
 */
export type FitMode = 'contain' | 'fill' | 'cover'

const DEFAULT_FIT: FitMode = 'contain'

/** 默认页边距（PDF points，上下左右各一份）。0 = 铺满页面无白边 */
const DEFAULT_MARGIN = 0
const MIN_MARGIN = 0
const MAX_MARGIN = 100

/**
 * 图片转 PDF 节点：接收若干张图片，把每张图片作为 PDF 的一页，
 * 输出一个合并好的 PDF 文件。
 *
 * 端口策略（借鉴 ImageOverlayNode）：
 * - 初始 1 个图片输入端口；所有端口都接上图片时自动新增一个
 * - 允许手动删减端口（只允许删尾部，避免 index 重排）
 * - 端口顺序 = PDF 页面顺序（image-0 → 第 1 页，image-1 → 第 2 页，依次类推）
 *
 * PDF 生成逻辑由 render.vue 在渲染端完成（用 pdf-lib），引擎侧只负责
 * 端口管理 + 状态维护。render.vue 在合适时机（输入值变化 / 手动触发）
 * 调用 generatePdf() 生成并 commit 输出端口。
 */
export class ImageToPdfNode extends Node {
  static readonly TYPE = 'image-to-pdf'

  readonly type = ImageToPdfNode.TYPE

  /** 输出端口：合并后的 PDF 文件 */
  readonly pdfOutput = new OutputPort('pdf', PdfFileValue, {
    zh: 'PDF 文件',
    en: 'PDF File',
    ja: 'PDFファイル',
    ko: 'PDF 파일',
    es: 'Archivo PDF',
    ar: 'ملف PDF',
    fr: 'Fichier PDF',
    pt: 'Arquivo PDF',
    ru: 'PDF-файл',
    hi: 'PDF फ़ाइल',
    id: 'Berkas PDF',
    de: 'PDF-Datei',
    vi: 'Tệp PDF',
    tr: 'PDF Dosyası',
    it: 'File PDF'
  })

  /** 方法端口：外部连线触发一次 PDF 生成（等同点「生成」按钮） */
  readonly generatePdfMethod = new MethodPort('generatePdf', {
    label: {
      zh: '生成 PDF',
      en: 'Generate PDF',
      ja: 'PDF生成',
      ko: 'PDF 생성',
      es: 'Generar PDF',
      ar: 'إنشاء PDF',
      fr: 'Générer PDF',
      pt: 'Gerar PDF',
      ru: 'Создать PDF',
      hi: 'PDF बनाएँ',
      id: 'Buat PDF',
      de: 'PDF erzeugen',
      vi: 'Tạo PDF',
      tr: 'PDF Oluştur',
      it: 'Genera PDF'
    }
  })

  /** MethodPort 被外部触发后设为 true，render.vue 在 onChanged 里消费它并执行生成 */
  private pendingMethodTrigger = false

  /**
   * PDF 页面尺寸（预设）。默认 A4。
   * 用 setter 写入时会自动同步 pageWidth / pageHeight。
   */
  private pageSize: PageSizePreset = 'A4'
  private pageWidth: number = PAGE_SIZE_PRESETS.A4.width
  private pageHeight: number = PAGE_SIZE_PRESETS.A4.height

  /** 页边距（PDF points，上下左右各一份）。默认 0 = 铺满无白边 */
  private pageMargin: number = DEFAULT_MARGIN

  /** 图片适配模式：contain / fill / cover */
  private fitMode: FitMode = DEFAULT_FIT

  /** 自动执行开关（持久化）：打开后收到图片自动生成 PDF */
  private autoRunEnabled = false

  constructor(id: string) {
    super(id)
    // 初始 1 个端口，后续按需自动扩
    this.addImagePort(0)
    this.addOutput(this.pdfOutput)
    this.addMethod(this.generatePdfMethod)
    // 方法端口被触发 → 设标记 + notifyChanged，render.vue 消费后执行生成
    this.generatePdfMethod.onTrigger(() => {
      this.pendingMethodTrigger = true
      this.notifyChanged()
    })
    // 内容区硬约束：紧凑卡片 + 一行生成按钮
    this.setBox(160, 138)
  }

  /** 创建并登记一个新的图片输入端口 */
  private addImagePort(index: number): InputPort {
    const port = new InputPort(`image-${index}`, {
      accepts: [ImgFileValue, ImgFileCollectionValue],
      multiple: false,
      label: {
        zh: `图片 ${index + 1}`,
        en: `Image ${index + 1}`,
        ja: `画像 ${index + 1}`,
        ko: `이미지 ${index + 1}`,
        es: `Imagen ${index + 1}`,
        ar: `صورة ${index + 1}`,
        fr: `Image ${index + 1}`,
        pt: `Imagem ${index + 1}`,
        ru: `Изображение ${index + 1}`,
        hi: `छवि ${index + 1}`,
        id: `Gambar ${index + 1}`,
        de: `Bild ${index + 1}`,
        vi: `Ảnh ${index + 1}`,
        tr: `Görsel ${index + 1}`,
        it: `Immagine ${index + 1}`
      }
    })
    this.addInput(port)
    return port
  }

  /**
   * 手动添加一个图片端口（render.vue 按钮触发）。
   * 新端口 id 按当前数量递增，label 自动编号。
   */
  addImage(): void {
    const nextIndex = this.inputPorts.length
    const port = this.addImagePort(nextIndex)
    port.setLabel({
      zh: `图片 ${nextIndex + 1}`,
      en: `Image ${nextIndex + 1}`,
      ja: `画像 ${nextIndex + 1}`,
      ko: `이미지 ${nextIndex + 1}`,
      es: `Imagen ${nextIndex + 1}`,
      ar: `صورة ${nextIndex + 1}`,
      fr: `Image ${nextIndex + 1}`,
      pt: `Imagem ${nextIndex + 1}`,
      ru: `Изображение ${nextIndex + 1}`,
      hi: `छवि ${nextIndex + 1}`,
      id: `Gambar ${nextIndex + 1}`,
      de: `Bild ${nextIndex + 1}`,
      vi: `Ảnh ${nextIndex + 1}`,
      tr: `Görsel ${nextIndex + 1}`,
      it: `Immagine ${nextIndex + 1}`
    })
  }

  /**
   * 删除最后一个图片端口（只允许删尾部，避免 index 重排）。
   * 至少保留 1 个端口（返回 false 表示拒绝删除）。
   */
  removeImagePort(portId: string): boolean {
    if (this.inputPorts.length <= 1) return false
    const last = this.inputPorts[this.inputPorts.length - 1]
    if (!last || last.id !== portId) return false // 只允许删尾部
    this.removeInput(last)
    return true
  }

  // —— Node 基类要求 ——

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean { return false }
  onFileDrop(_sourcePath: string): void { /* 不接收外部文件 */ }
  isPositionAcceptNodeDrop(_source: Node): boolean { return false }
  onNodeDrop(_source: Node, _startPos: readonly [number, number]): boolean { return false }

  /**
   * 输入端口事件统一入口：
   * - 所有端口都被占满时，自动新增一个空端口
   * - 通知视图刷新（render.vue 收到 notifyChanged 后会触发 PDF 重生成）
   */
  inputPortReceiveValue(_ports: InputPort[]): void {
    // 自动扩容：所有端口都接上了值 → 新增一个空端口
    const allConnected = this.inputPorts.length > 0
      && this.inputPorts.every((p) => p.incoming.size > 0)
    if (allConnected) {
      this.addImage()
    }
    this.notifyChanged()
  }

  /**
   * 获取所有已连接端口的图片值，按端口顺序排列。
   * 单个 ImgFileValue 直接加；ImgFileCollectionValue 展开 items 全部加入。
   * 用于 render.vue 生成 PDF。
   */
  getConnectedImages(): Array<{ portId: string; file: File }> {
    const result: Array<{ portId: string; file: File }> = []
    for (const port of this.inputPorts) {
      for (const [edge, value] of port.incoming) {
        if (value instanceof ImgFileValue && !value.isNull && value.file) {
          result.push({ portId: port.id, file: value.file })
        } else if (value instanceof ImgFileCollectionValue && !value.isNull && value.items) {
          for (const item of value.items) {
            if (!item.isNull && item.file) {
              result.push({ portId: port.id, file: item.file })
            }
          }
        }
        void edge // edge 不使用，避免未使用变量警告
      }
    }
    return result
  }

  /**
   * 由 render.vue 调用：将 base64 PDF 字节 commit 到输出端口。
   *
   * @param base64   PDF 二进制的 base64 编码
   * @param fileName PDF 文件名（如 output.pdf）
   */
  setOutput(base64: string, fileName: string): void {
    const bytes = base64ToBytes(base64)
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const file = new File([ab], fileName, { type: 'application/pdf' })
    const hash = djb2(base64)
    this.pdfOutput.commit(new PdfFileValue(file, hash))
    // 消化 dirty → stable：commit 了输出 = 输入的图片已经被处理完了
    this.completeRun()
  }

  /** 所有端口都连接了图片值（render.vue 用来决定是否可以生成 PDF） */
  get hasAllImagesConnected(): boolean {
    return this.inputPorts.length > 0
      && this.inputPorts.every((p) => p.incoming.size > 0)
  }

  /** 所有输入端口累计传入的图片张数（ImgFileCollectionValue 展开后计数） */
  get totalImageCount(): number {
    return this.getConnectedImages().length
  }

  /** 渲染层读自动执行开关状态 */
  get displayAutoRun(): boolean {
    return this.autoRunEnabled
  }

  /** 切换自动执行开关 */
  setAutoRun(enabled: boolean): void {
    if (this.autoRunEnabled === enabled) return
    this.autoRunEnabled = enabled
    this.notifyChanged()
  }

  /** MethodPort 是否有待消费的触发信号（render.vue 读它决定是否执行生成） */
  get hasPendingMethodTrigger(): boolean {
    return this.pendingMethodTrigger
  }

  /** render.vue 消费完 MethodPort 触发后调它清掉标记，避免下一轮 notifyChanged 重复触发 */
  consumePendingMethodTrigger(): void {
    this.pendingMethodTrigger = false
  }

  // —— PDF 页面配置 ——

  /** 当前页面尺寸预设 key（'A4' / 'A3' / ...） */
  get pdfPageSize(): PageSizePreset { return this.pageSize }
  /** 当前页面宽度（PDF points） */
  get pdfPageWidth(): number { return this.pageWidth }
  /** 当前页面高度（PDF points） */
  get pdfPageHeight(): number { return this.pageHeight }
  /** 当前页边距（PDF points，上下左右各一份） */
  get pdfMargin(): number { return this.pageMargin }

  /**
   * 按预设 key 设置页面尺寸。已知 key 用预设值，未知 key 忽略。
   */
  setPdfPageSize(preset: PageSizePreset): void {
    const p = PAGE_SIZE_PRESETS[preset]
    if (!p) return
    if (this.pageSize === preset) return
    this.pageSize = preset
    this.pageWidth = p.width
    this.pageHeight = p.height
    this.notifyChanged()
  }

  /** 设置页边距（PDF points），自动夹紧到 [0, 100] */
  setPdfMargin(margin: number): void {
    const m = Math.round(Math.max(MIN_MARGIN, Math.min(MAX_MARGIN, margin)))
    if (m === this.pageMargin) return
    this.pageMargin = m
    this.notifyChanged()
  }

  /** 当前图片适配模式 */
  get pdfFitMode(): FitMode { return this.fitMode }

  /** 设置图片适配模式。未知值忽略 */
  setPdfFitMode(mode: FitMode): void {
    if (mode === this.fitMode) return
    this.fitMode = mode
    this.notifyChanged()
  }

  // —— 序列化 ——

  saveState(): Record<string, unknown> {
    const [w, h] = this.box
    return {
      box: [w, h],
      portCount: this.inputPorts.length,
      pageSize: this.pageSize,
      margin: this.pageMargin,
      fitMode: this.fitMode,
      autoRun: this.autoRunEnabled
    }
  }

  readState(state: Record<string, unknown>): void {
    const savedCount = typeof state.portCount === 'number' && state.portCount >= 1
      ? state.portCount : 1
    const savedBox = state.box as [number, number] | undefined

    // 页面配置
    if (typeof state.pageSize === 'string' && state.pageSize in PAGE_SIZE_PRESETS) {
      this.setPdfPageSize(state.pageSize as PageSizePreset)
    }
    if (typeof state.margin === 'number') {
      this.setPdfMargin(state.margin)
    }
    if (state.fitMode === 'contain' || state.fitMode === 'fill' || state.fitMode === 'cover') {
      this.setPdfFitMode(state.fitMode)
    }
    if (typeof state.autoRun === 'boolean') {
      this.autoRunEnabled = state.autoRun
    }

    if (Array.isArray(savedBox) && savedBox.length === 2) {
      this.setBox(savedBox[0], savedBox[1])
    }

    // 清掉构造时创建的默认端口，按保存的数量重建
    const existing = [...this.inputPorts]
    for (const p of existing) {
      this.removeInput(p)
    }
    for (let i = 0; i < savedCount; i++) {
      this.addImagePort(i)
    }
  }
}
