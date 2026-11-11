import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { workspaceScene } from '../../engine/graph/SceneRegistry'

/** JPEG 输出质量（固定策略） */
const JPEG_QUALITY = 0.85

/**
 * 缩小图片尺寸节点：接收图片，按最长边等比缩放到目标尺寸后输出（不改质量参数）。
 *
 * 与 ImageQualityNode（画质调整，不改尺寸）区分：本节点管「尺寸」，它管「画质」。
 *
 * 两种触发方式：
 * 1. **节点拖入**（一次性）：把图片节点（输出 ImgFileValue 的节点）拖进来压缩一次。
 *    不订阅源节点、不建立持久关系——拖一次压一次，之后源节点变化不再触发；
 *    画布恢复后也不自动重压。
 * 2. **端口输入**（响应式）：左侧 imageInput 端口接 ImgFileValue 上游，
 *    上游值变化时自动重新压缩。
 *
 * 两种方式共存，端口值优先于拖入路径（如果同时存在，用端口值）。
 *
 * 目标尺寸来自 size 输入端口（NumberValue，最长边像素）；未接线时用默认值。
 * 尺寸变更会通知 UI 刷新展示，但不会自动重压已有结果——等下次触发（拖入或端口值变）时生效。
 *
 * 导出格式由卡片上的 jpg/png 下拉选择（默认 jpg），变更后与尺寸变更同理：
 * 通知 UI 刷新，等下次触发时按新格式重压。
 *
 * 引擎侧职责「收信号 + 提交结果」：
 * - 拖入路径：onNodeDrop(source) 暂存 pendingSourceId → notifyChanged → render.vue 读源值压缩
 * - 端口路径：imageInput.receive → inputPortReceiveValue → notifyChanged → render.vue 读端口值压缩
 * - render.vue 压缩完成调 setOutput(base64, mime, fileName) → commit 到输出端口 → 下游刷新
 */
export type ImageExportFormat = 'jpg' | 'png'

export class ImageCompressNode extends Node {
  static readonly TYPE = 'image-compress'

  readonly type = ImageCompressNode.TYPE

  /** 输入端口：目标尺寸（最长边像素，NumberValue）。未接线用端口 defaultValue */
  readonly sizeInput = new InputPort('size', {
    accepts: [NumberValue],
    label: {
      zh: '尺寸',
      en: 'Size',
      ja: 'サイズ',
      ko: '크기',
      es: 'Tamaño',
      ar: 'الحجم',
      fr: 'Taille',
      pt: 'Tamanho',
      ru: 'Размер',
      hi: 'आकार',
      id: 'Ukuran',
      de: 'Größe',
      vi: 'Kích thước',
      tr: 'Boyut',
      it: 'Dimensione'
    },
    defaultValue: new NumberValue(800)
  })

  /** 输入端口：图片值（ImgFileValue）。接线后上游值变化会自动触发重新压缩 */
  readonly imageInput = new InputPort('source', {
    accepts: [ImgFileValue],
    label: {
      zh: '图片',
      en: 'Image',
      ja: '画像',
      ko: '이미지',
      es: 'Imagen',
      ar: 'صورة',
      fr: 'Image',
      pt: 'Imagem',
      ru: 'Изображение',
      hi: 'छवि',
      id: 'Gambar',
      de: 'Bild',
      vi: 'Ảnh',
      tr: 'Görüntü',
      it: 'Immagine'
    }
  })

  /** 输出端口：压缩后的图片 */
  readonly imageOutput = new OutputPort('image', ImgFileValue, {
    zh: '压缩图',
    en: 'Compressed Image',
    ja: '圧縮画像',
    ko: '압축된 이미지',
    es: 'Imagen comprimida',
    ar: 'صورة مضغوطة',
    fr: 'Image compressée',
    pt: 'Imagem comprimida',
    ru: 'Сжатое изображение',
    hi: 'संपीड़ित छवि',
    id: 'Gambar terkompresi',
    de: 'Komprimiertes Bild',
    vi: 'Ảnh đã nén',
    tr: 'Sıkıştırılmış görüntü',
    it: 'Immagine compressa'
  })

  /** 本次要处理的源节点 id（拖入路径的触发信号）。一次拖入只处理一次，处理完清空 */
  private pendingSourceId: string | null = null

  /** 最近一次压缩的源文件 fingerprint（ImgFileValue.fingerprint），用于去重：
   * 端口路径响应式触发时，如果 fingerprint 没变就跳过（避免重入） */
  private lastCompressedFingerprint: string | null = null

  /** 最近一次压缩时的 targetSize（最长边像素），尺寸变化也要重压 */
  private lastCompressedSize: number | null = null

  /** 最近一次压缩时的导出格式，格式变化也要重压 */
  private lastCompressedFormat: ImageExportFormat | null = null

  /** 导出格式（jpg 有损体积小 / png 无损可留透明），默认 jpg */
  private format: ImageExportFormat = 'jpg'

  constructor(id: string) {
    super(id)
    this.addInput(this.sizeInput)
    this.addInput(this.imageInput)
    this.addOutput(this.imageOutput)
    // 内容区硬约束：头部标签（含格式下拉）+ 预览区 + 底部信息栏（体积信息行 + 按钮，纵向两行）
    this.setBox(255, 260)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收外部文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 接受判定：源节点必须带一个输出 ImgFileValue 的端口（图片产出者） */
  isPositionAcceptNodeDrop(source: Node): boolean {
    return source.outputPorts.some((p) => p.valueClass === ImgFileValue)
  }

  /**
   * 节点 drop 结算：接收被拖节点，做一次性工作，然后把被拖节点还原到拖拽前位置。
   * 不订阅源、不存绑定关系、不持久化——只把源节点 id 暂存为触发信号，
   * render.vue 收到信号后去压缩一次。
   */
  onNodeDrop(source: Node, startPos: readonly [number, number]): boolean {
    this.pendingSourceId = source.id
    this.notifyChanged()
    // 一次性工作节点：拖进来是为了"让我干个活"，干完把人家送回原位
    source.setPosition(startPos[0], startPos[1])
    return true
  }

  /** 本次待压缩的源节点（render.vue 收到信号后读它的图片值）——拖入路径专用 */
  get pendingSource(): Node | undefined {
    if (!this.pendingSourceId) return undefined
    return workspaceScene.getNode(this.pendingSourceId)
  }

  /**
   * 压缩源文件：拖入路径优先于端口路径。
   * - pendingSource 非空 = 用户明确拖进来干个活 → 用拖入节点的图
   * - 否则回退到 imageInput 端口值（响应式路径）
   *
   * 返回 File + fingerprint（来自 ImgFileValue），没有可用源时返回 null。
   */
  get compressSource(): { file: File; fingerprint: string } | null {
    // 拖入优先：用户拖进来是明确意图，别让端口值吞了它
    const source = this.pendingSource
    if (source) {
      const port = source.outputPorts.find((p) => p.valueClass === ImgFileValue)
      const value = port?.value
      if (value instanceof ImgFileValue && !value.isNull) {
        return { file: value.file!, fingerprint: value.fingerprint }
      }
    }
    // 回退到端口（响应式）
    const [first] = this.imageInput.value
    if (first instanceof ImgFileValue && !first.isNull) {
      return { file: first.file!, fingerprint: first.fingerprint }
    }
    return null
  }

  /** 最近一次压缩的源 fingerprint，render.vue 用来判断是否需要跳过重复压缩 */
  get lastCompressedFp(): string | null {
    return this.lastCompressedFingerprint
  }

  /** 最近一次压缩时的 targetSize，render.vue 用来判断尺寸变了是否要重压 */
  get lastCompressedSz(): number | null {
    return this.lastCompressedSize
  }

  /** 导出格式（jpg/png），UI 直接读它 */
  get exportFormat(): ImageExportFormat {
    return this.format
  }

  /** 切换导出格式：通知视图刷新，render.vue 据此重压（与尺寸变更同理） */
  setExportFormat(value: ImageExportFormat): void {
    if (value === this.format) return
    this.format = value
    this.notifyChanged()
  }

  /** 最近一次压缩时的导出格式，render.vue 用来判断格式变了是否要重压 */
  get lastCompressedFmt(): ImageExportFormat | null {
    return this.lastCompressedFormat
  }

  /** 渲染侧压缩完成后调用，同时记录 fingerprint、size 和格式，用于后续去重判断 */
  markCompressed(fingerprint: string, size: number, format: ImageExportFormat): void {
    this.lastCompressedFingerprint = fingerprint
    this.lastCompressedSize = size
    this.lastCompressedFormat = format
  }

  /**
   * 目标尺寸（最长边像素）：来自 size 输入端口；未接线/值非法时用默认值。
   * 压缩时读它——改尺寸只刷新 UI 展示，不自动重压已有结果，等下次触发（拖入或端口值变）生效。
   */
  get targetSize(): number {
    const [first] = this.sizeInput.value
    if (first instanceof NumberValue && !first.isNull) {
      const v = Math.round(first.value!)
      if (Number.isFinite(v) && v > 0) return v
    }
    return 800 // 兜底，理论上 effectiveValue 总会命中 defaultValue
  }

  // —— 压缩执行状态 ——

  /** 原始图片大小（字节），UI 体积展示用 */
  private sourceSize = 0

  /** 压缩中标记：防 onChanged 重入导致重复压缩 */
  private compressing = false

  /** 自订阅的取消函数（onReady 里注册，beforeDestroy 里清理） */
  private selfUnsubscribe: (() => void) | null = null

  /** 原始体积（字节），UI 只读 */
  get sourceSizeBytes(): number {
    return this.sourceSize
  }

  /** 压缩后体积（字节），从输出端口值直接取，UI 只读 */
  get compressedSizeBytes(): number {
    const v = this.imageOutput.value
    if (v instanceof ImgFileValue && v.file) return v.file.size
    return 0
  }

  // —— 生命周期 ——

  onReady(): void {
    // 自订阅 onChanged：压缩触发信号由自身 notifyChanged 发出（拖入、端口值变、格式变）
    this.selfUnsubscribe = this.onChanged(() => {
      this.handleCompress()
    })
    // 启动时先试一次——端口可能已有值但没触发过 notifyChanged
    this.handleCompress()
  }

  beforeDestroy(): void {
    this.selfUnsubscribe?.()
    this.selfUnsubscribe = null
  }

  // —— 压缩核心（DOM API，renderer 进程内执行） ——

  /** 导出格式 → MIME / 扩展名 */
  private mimeForFormat(format: ImageExportFormat): string {
    return format === 'png' ? 'image/png' : 'image/jpeg'
  }

  private extForFormat(format: ImageExportFormat): string {
    return format === 'png' ? '.png' : '.jpg'
  }

  /** 去掉源文件名的后缀 */
  private baseName(fileName: string): string {
    const dot = fileName.lastIndexOf('.')
    return dot > 0 ? fileName.slice(0, dot) : fileName
  }

  /** 加载图片（Promise 化） */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('image load failed'))
      img.src = url
    })
  }

  /** 执行一次压缩：File → canvas 按比例缩小 → toDataURL → setOutput */
  private async runCompress(file: File): Promise<void> {
    this.sourceSize = file.size
    const url = URL.createObjectURL(file)
    try {
      const img = await this.loadImage(url)
      const scale = Math.min(1, this.targetSize / Math.max(img.naturalWidth, img.naturalHeight))
      const width = Math.max(1, Math.round(img.naturalWidth * scale))
      const height = Math.max(1, Math.round(img.naturalHeight * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, width, height)

      const format = this.format
      const mime = this.mimeForFormat(format)
      const dataUrl = format === 'jpg' ? canvas.toDataURL(mime, JPEG_QUALITY) : canvas.toDataURL(mime)
      const comma = dataUrl.indexOf(',')
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
      const fileName = `${this.baseName(file.name)}-compressed${this.extForFormat(format)}`

      this.setOutput(base64, mime, fileName)
    } catch {
      // 源图加载失败（文件可能已被删）→ 静默跳过，等下次触发
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  /**
   * 检查是否需要压缩：读 compressSource 判断有无可用源，再用 fingerprint 去重。
   * - 端口路径（响应式）：fingerprint / 尺寸 / 格式任一变化就压缩
   * - 拖入路径（一次性）：pendingSource 非空表示需要压一次
   */
  private handleCompress(): void {
    if (this.compressing) return
    const src = this.compressSource
    if (!src) return

    const isPending = !!this.pendingSource // 拖入路径有触发信号
    const fpChanged = src.fingerprint !== this.lastCompressedFingerprint
    const sizeChanged = this.targetSize !== this.lastCompressedSize
    const formatChanged = this.format !== this.lastCompressedFormat

    // 去重：源文件没变 + 尺寸没变 + 格式没变 + 不是拖入触发 → 跳过
    if (!fpChanged && !sizeChanged && !formatChanged && !isPending) return

    this.compressing = true
    this.runCompress(src.file)
      .catch(() => { /* runCompress 内部已吞异常 */ })
      .finally(() => {
        this.compressing = false
        this.markCompressed(src.fingerprint, this.targetSize, this.format)
        // 拖入路径处理完清信号（端口路径不清，保持响应式）
        if (isPending) this.clearPendingSilent()
      })
  }

  /** 压缩完成后内部清 pending 信号，不走 notifyChanged 避免重入 */
  private clearPendingSilent(): void {
    this.pendingSourceId = null
  }

  /** 压缩完成后由 render.vue 调用，清空拖入路径的触发信号（端口路径不清） */
  clearPending(): void {
    if (!this.pendingSourceId) return
    this.pendingSourceId = null
    this.notifyChanged()
  }

  /**
   * 提交压缩结果并 commit imageOutput（render.vue 压缩完成后调用）。
   *
   * @param base64   压缩图二进制的 base64 编码（canvas.toDataURL 抽取）
   * @param mime     压缩图 MIME（决定 File 的 type）
   * @param fileName 压缩图文件名（展示用；压缩结果不落盘）
   */
  setOutput(base64: string, mime: string, fileName: string): void {
    const bytes = base64ToBytes(base64)
    // 显式取 slice 后的纯 ArrayBuffer，避免 TS 5.x 把 Uint8Array<ArrayBufferLike> 卡在 File 构造上
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const file = new File([ab], fileName, { type: mime })
    const hash = djb2(base64)
    this.imageOutput.commit(new ImgFileValue(file, hash))
    // 同步节点：commit 输出就算消化完输入 → 回 stable
    this.completeRun()
  }

  /**
   * 输入端口值变化：通知视图刷新。
   * - imageInput 变化 → render.vue 收到通知后会检查 compressSource，触发压缩（端口路径响应式）
   * - sizeInput 变化 → render.vue 只刷新尺寸展示，不自动重压已有结果
   */
  inputPortReceiveValue(_ports: InputPort[]): void {
    this.notifyChanged()
  }

  /** 一次性工作：压缩结果不持久化，只记住用户的导出格式偏好 */
  saveState(): Record<string, unknown> {
    return { ...super.saveState(), format: this.format }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    // 只恢复格式偏好——压缩结果等用户再拖一次 / 上游值变化
    if (state.format === 'jpg' || state.format === 'png') this.format = state.format
  }
}
