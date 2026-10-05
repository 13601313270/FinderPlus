import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { workspaceScene } from '../../engine/graph/SceneRegistry'

/** 裁剪框矩形：原图像素坐标。null 表示用户还没手动选（render.vue 会画全图默认框） */
export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * 图片裁剪节点：接收图片，裁剪后输出。
 *
 * 两种触发方式（完全复用 ImageCompressNode 架构）：
 * 1. **节点拖入**（一次性）：把图片节点拖进来 → 裁剪一次。
 *    不订阅源节点、不建立持久关系——拖一次裁一次，之后源节点变化不再触发；
 *    画布恢复后也不自动重裁。
 * 2. **端口输入**（响应式）：左侧 imageInput 端口接 ImgFileValue 上游，
 *    上游值变化时自动刷新源图和裁剪框。
 *
 * 裁剪框坐标存**原图像素坐标**，由 render.vue 里用户交互设置（pointer 事件），
 * 渲染时用 CSS scale 适配 canvas 展示尺寸——engine 层只存像素坐标，不管展示缩放。
 *
 * 用户点「确认裁剪」后才真正执行裁剪（ctx.drawImage 按 cropRect 抽区域），
 * 结果 commit 到 imageOutput → 下游刷新。
 */
export class ImageCropNode extends Node {
  static readonly TYPE = 'image-crop'

  readonly type = ImageCropNode.TYPE

  /** 输入端口：图片值（ImgFileValue）。接线后上游值变化会自动刷新源图和裁剪框 */
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

  /** 输出端口：裁剪后的图片 */
  readonly imageOutput = new OutputPort('image', ImgFileValue, {
    zh: '裁剪图',
    en: 'Cropped Image',
    ja: '切り抜き画像',
    ko: '잘린 이미지',
    es: 'Imagen recortada',
    ar: 'صورة مقصوصة',
    fr: 'Image recadrée',
    pt: 'Imagem recortada',
    ru: 'Обрезанное изображение',
    hi: 'क्रॉप की गई छवि',
    id: 'Gambar yang dipangkas',
    de: 'Zugeschnittenes Bild',
    vi: 'Ảnh đã cắt',
    tr: 'Kırpılmış görüntü',
    it: 'Immagine ritagliata'
  })

  /** 本次要处理的源节点 id（拖入路径的触发信号）。一次拖入只处理一次，处理完清空 */
  private pendingSourceId: string | null = null

  /** 裁剪框（原图像素坐标）。null = render.vue 里画全图默认框 */
  private cropRectValue: CropRect | null = null

  /** 最近一次裁剪的源文件 fingerprint（ImgFileValue.fingerprint），用于去重 */
  private lastCroppedFingerprint: string | null = null

  /** 最近一次裁剪时的 cropRect（JSON 序列化后字符串），用于去重 */
  private lastCroppedRectHash: string | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.imageInput)
    this.addOutput(this.imageOutput)
    // 内容区硬约束：头部标签 + canvas 预览区（方形） + 底部操作栏
    this.setBox(350, 380)
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
   */
  onNodeDrop(source: Node, startPos: readonly [number, number]): boolean {
    this.pendingSourceId = source.id
    // 拖入新图 → 重置裁剪框为 null（render.vue 会画全图默认框）
    this.cropRectValue = null
    this.notifyChanged()
    source.setPosition(startPos[0], startPos[1])
    return true
  }

  /** 本次待裁剪的源节点（render.vue 收到信号后读它的图片值）——拖入路径专用 */
  get pendingSource(): Node | undefined {
    if (!this.pendingSourceId) return undefined
    return workspaceScene.getNode(this.pendingSourceId)
  }

  /**
   * 裁剪源文件：拖入路径优先于端口路径。
   * - pendingSource 非空 = 用户明确拖进来干个活 → 用拖入节点的图
   * - 否则回退到 imageInput 端口值（响应式路径）
   */
  get cropSource(): { file: File; fingerprint: string } | null {
    const source = this.pendingSource
    if (source) {
      const port = source.outputPorts.find((p) => p.valueClass === ImgFileValue)
      const value = port?.value
      if (value instanceof ImgFileValue && !value.isNull) {
        return { file: value.file!, fingerprint: value.fingerprint }
      }
    }
    const [first] = this.imageInput.value
    if (first instanceof ImgFileValue && !first.isNull) {
      return { file: first.file!, fingerprint: first.fingerprint }
    }
    return null
  }

  /** 裁剪框（原图像素坐标）。null = render.vue 画全图默认框 */
  get cropRect(): CropRect | null {
    return this.cropRectValue
  }

  /** render.vue 更新裁剪框时调用 */
  setCropRect(rect: CropRect | null): void {
    this.cropRectValue = rect
    this.notifyChanged()
  }

  /** 最近一次裁剪的源 fingerprint，render.vue 用来判断是否需要跳过 */
  get lastCroppedFp(): string | null {
    return this.lastCroppedFingerprint
  }

  /** 最近一次裁剪时的 cropRect hash，render.vue 用来判断裁剪框变没变 */
  get lastCroppedRect(): string | null {
    return this.lastCroppedRectHash
  }

  /** 渲染侧裁剪完成后调用，记录 fingerprint 和 rect，用于后续去重 */
  markCropped(fingerprint: string, rectHash: string): void {
    this.lastCroppedFingerprint = fingerprint
    this.lastCroppedRectHash = rectHash
  }

  /** 拖入路径处理完清信号 */
  clearPending(): void {
    if (!this.pendingSourceId) return
    this.pendingSourceId = null
    this.notifyChanged()
  }

  /**
   * 提交裁剪结果并 commit imageOutput（render.vue 裁剪完成后调用）。
   */
  setOutput(base64: string, mime: string, fileName: string): void {
    const bytes = base64ToBytes(base64)
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const file = new File([ab], fileName, { type: mime })
    const hash = djb2(base64)
    this.imageOutput.commit(new ImgFileValue(file, hash))
    this.notifyChanged()
  }

  /**
   * 输入端口值变化：通知视图刷新源图和裁剪框。
   * - imageInput 变化 → 刷新源图 + 重置裁剪框为 null（全图默认）
   */
  inputPortReceiveValue(_ports: InputPort[]): void {
    // 端口响应式源图变化 → 重置裁剪框，让 render.vue 画全图默认框
    this.cropRectValue = null
    this.notifyChanged()
  }

  /** 持久化：存裁剪框位置（engine 侧状态） */
  saveState(): Record<string, unknown> {
    return {
      cropRect: this.cropRectValue
        ? { x: this.cropRectValue.x, y: this.cropRectValue.y, w: this.cropRectValue.w, h: this.cropRectValue.h }
        : null
    }
  }

  readState(state: Record<string, unknown>): void {
    const rect = state.cropRect as CropRect | null | undefined
    if (rect && typeof rect.x === 'number' && typeof rect.y === 'number'
      && typeof rect.w === 'number' && typeof rect.h === 'number') {
      this.cropRectValue = { x: rect.x, y: rect.y, w: rect.w, h: rect.h }
    } else {
      this.cropRectValue = null
    }
    this.notifyChanged()
  }
}
