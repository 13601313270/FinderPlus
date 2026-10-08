import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { PdfFileValue } from '../../engine/data/PdfFileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

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

  constructor(id: string) {
    super(id)
    // 初始 1 个端口，后续按需自动扩
    this.addImagePort(0)
    this.addOutput(this.pdfOutput)
    // 内容区硬约束：简单的处理节点，比文件卡片宽一点
    this.setBox(200, 180)
  }

  /** 创建并登记一个新的图片输入端口 */
  private addImagePort(index: number): InputPort {
    const port = new InputPort(`image-${index}`, {
      accepts: [ImgFileValue],
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
   * 用于 render.vue 生成 PDF。
   */
  getConnectedImages(): Array<{ portId: string; file: File }> {
    const result: Array<{ portId: string; file: File }> = []
    for (const port of this.inputPorts) {
      for (const [edge, value] of port.incoming) {
        if (value instanceof ImgFileValue && !value.isNull && value.file) {
          result.push({ portId: port.id, file: value.file })
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
    this.notifyChanged()
  }

  /** 所有端口都连接了图片值（render.vue 用来决定是否可以生成 PDF） */
  get hasAllImagesConnected(): boolean {
    return this.inputPorts.length > 0
      && this.inputPorts.every((p) => p.incoming.size > 0)
  }

  /** 已连接的图片数量 */
  get connectedImageCount(): number {
    return this.inputPorts.filter((p) => p.incoming.size > 0).length
  }

  // —— 序列化 ——

  saveState(): Record<string, unknown> {
    const [w, h] = this.box
    return {
      box: [w, h],
      portCount: this.inputPorts.length
    }
  }

  readState(state: Record<string, unknown>): void {
    const savedCount = typeof state.portCount === 'number' && state.portCount >= 1
      ? state.portCount : 1
    const savedBox = state.box as [number, number] | undefined

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
