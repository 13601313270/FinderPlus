import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { workspaceScene } from '../../engine/graph/SceneRegistry'

/**
 * 图片质量调整节点：接收图片，按「质量 + 导出格式」重新压缩输出。
 *
 * 与 ImageCompressNode（按最长边缩放）的区别：本节点不改尺寸，只调质量与格式，
 * 底层编码走 Rust → WASM 的 img-compressor-wasm（render.vue 侧调用）。
 *
 * 两种触发方式（与 ImageCompressNode 一致）：
 * 1. **节点拖入**（一次性）：把图片节点拖进来压缩一次，不订阅源、不持久化关系。
 * 2. **端口输入**（响应式）：左侧 imageInput 端口接 ImgFileValue 上游，上游值变化自动重压。
 *
 * 引擎侧职责「收信号 + 提交结果」：
 * - 拖入路径：onNodeDrop(source) 暂存 pendingSourceId → notifyChanged → render.vue 读源值压缩
 * - 端口路径：imageInput.receive → inputPortReceiveValue → notifyChanged → render.vue 读端口值压缩
 * - render.vue 压缩完成调 setOutput(base64, mime, fileName) → commit 到输出端口 → 下游刷新
 */
export type ImageQualityFormat = 'jpeg' | 'png'

/** 质量默认值（1–100） */
const DEFAULT_QUALITY = 80

export class ImageQualityNode extends Node {
  static readonly TYPE = 'image-quality'

  readonly type = ImageQualityNode.TYPE

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

  /** 输出端口：调整后的图片 */
  readonly imageOutput = new OutputPort('image', ImgFileValue, {
    zh: '调整后',
    en: 'Adjusted',
    ja: '調整後',
    ko: '조정됨',
    es: 'Ajustado',
    ar: 'بعد الضبط',
    fr: 'Ajusté',
    pt: 'Ajustado',
    ru: 'Скорректировано',
    hi: 'समायोजित',
    id: 'Disesuaikan',
    de: 'Angepasst',
    vi: 'Đã điều chỉnh',
    tr: 'Ayarlanmış',
    it: 'Regolata'
  })

  /** 本次要处理的源节点 id（拖入路径的触发信号）。一次拖入只处理一次，处理完清空 */
  private pendingSourceId: string | null = null

  /** 质量（1–100）：越小体积越小、画质越低 */
  private quality = DEFAULT_QUALITY

  /** 导出格式：jpeg 有损体积小 / png 可留透明，默认 jpeg */
  private format: ImageQualityFormat = 'jpeg'

  /** 最近一次处理的源文件 fingerprint（ImgFileValue.fingerprint），用于去重 */
  private lastProcessedFingerprint: string | null = null

  /** 最近一次处理时的质量，质量变化也要重压 */
  private lastProcessedQuality: number | null = null

  /** 最近一次处理时的导出格式，格式变化也要重压 */
  private lastProcessedFormat: ImageQualityFormat | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.imageInput)
    this.addOutput(this.imageOutput)
    // 内容区硬约束：头部标签（含格式下拉）+ 预览区 + 质量滑杆 + 底部信息栏
    this.setBox(260, 300)
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
   * 不订阅源、不存绑定关系、不持久化——只把源节点 id 暂存为触发信号。
   */
  onNodeDrop(source: Node, startPos: readonly [number, number]): boolean {
    this.pendingSourceId = source.id
    this.notifyChanged()
    // 一次性工作节点：拖进来是为了"让我干个活"，干完把人家送回原位
    source.setPosition(startPos[0], startPos[1])
    return true
  }

  /** 本次待处理的源节点（render.vue 收到信号后读它的图片值）——拖入路径专用 */
  get pendingSource(): Node | undefined {
    if (!this.pendingSourceId) return undefined
    return workspaceScene.getNode(this.pendingSourceId)
  }

  /**
   * 压缩源文件：拖入路径优先于端口路径。
   * 返回 File + fingerprint（来自 ImgFileValue），没有可用源时返回 null。
   */
  get compressSource(): { file: File; fingerprint: string } | null {
    // 拖入优先：用户拖进来是明确意图，别让端口值吞了它
    const source = this.pendingSource
    if (source) {
      const port = source.outputPorts.find((p) => p.valueClass === ImgFileValue)
      const value = port?.value
      if (value instanceof ImgFileValue) {
        return { file: value.file, fingerprint: value.fingerprint }
      }
    }
    // 回退到端口（响应式）
    const [first] = this.imageInput.value
    if (first instanceof ImgFileValue) {
      return { file: first.file, fingerprint: first.fingerprint }
    }
    return null
  }

  /** 当前质量（1–100），UI 直接读它 */
  get qualityValue(): number {
    return this.quality
  }

  /** 导出格式（jpeg/png），UI 直接读它 */
  get exportFormat(): ImageQualityFormat {
    return this.format
  }

  /** 最近一次处理的源 fingerprint，render.vue 用来判断是否需要跳过重复压缩 */
  get lastProcessedFp(): string | null {
    return this.lastProcessedFingerprint
  }

  /** 最近一次处理时的质量，render.vue 用来判断质量变了是否要重压 */
  get lastProcessedQ(): number | null {
    return this.lastProcessedQuality
  }

  /** 最近一次处理时的导出格式，render.vue 用来判断格式变了是否要重压 */
  get lastProcessedFmt(): ImageQualityFormat | null {
    return this.lastProcessedFormat
  }

  /** 设置质量：clamp 到 1–100 取整；变更则通知视图刷新，render.vue 据此重压 */
  setQuality(value: number): void {
    const v = Math.min(100, Math.max(1, Math.round(value)))
    if (v === this.quality) return
    this.quality = v
    this.notifyChanged()
  }

  /** 切换导出格式：通知视图刷新，render.vue 据此重压（与质量变更同理） */
  setFormat(value: ImageQualityFormat): void {
    if (value === this.format) return
    this.format = value
    this.notifyChanged()
  }

  /** 渲染侧压缩完成后调用，记录 fingerprint、质量和格式，用于后续去重判断 */
  markProcessed(fingerprint: string, quality: number, format: ImageQualityFormat): void {
    this.lastProcessedFingerprint = fingerprint
    this.lastProcessedQuality = quality
    this.lastProcessedFormat = format
  }

  /** 处理完成后由 render.vue 调用，清空拖入路径的触发信号（端口路径不清） */
  clearPending(): void {
    if (!this.pendingSourceId) return
    this.pendingSourceId = null
    this.notifyChanged()
  }

  /**
   * 提交压缩结果并 commit imageOutput（render.vue 压缩完成后调用）。
   *
   * @param base64   压缩图二进制的 base64 编码
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
    this.notifyChanged()
  }

  /** 输入端口值变化：通知视图刷新（render.vue 据此触发重新压缩） */
  inputPortReceiveValue(_ports: InputPort[]): void {
    this.notifyChanged()
  }

  /** 一次性工作：压缩结果不持久化，只记住用户的质量与格式偏好 */
  saveState(): Record<string, unknown> {
    return { quality: this.quality, format: this.format }
  }

  readState(state: Record<string, unknown>): void {
    const q = state.quality
    if (typeof q === 'number' && Number.isFinite(q)) {
      this.quality = Math.min(100, Math.max(1, Math.round(q)))
    }
    if (state.format === 'jpeg' || state.format === 'png') this.format = state.format
  }
}
