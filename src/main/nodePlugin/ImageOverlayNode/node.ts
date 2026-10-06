import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { Edge } from '../../engine/graph/Edge'

/** 引擎侧能接受的图层值类型联合 */
export type LayerValue = ImgFileValue | StringValue

/**
 * 单层变换状态：key 是 InputPort.id（'layer-0', 'layer-1', ...）。
 * 坐标系是最终合成画布的像素坐标系，(0, 0) 为画布左上角。
 */
export interface LayerState {
  /** 图层种类：图片 | 文本 */
  kind: 'image' | 'text'
  x: number
  y: number
  width: number
  height: number
  /** 是否已用真实 natural 尺寸初始化过（false = 占位值，允许自动覆盖；
   *  true = 用户可能已手动调整，不再自动覆盖） */
  initialized: boolean
  /** 文本图层专用：默认字体 48px sans-serif，黑色，左对齐，无背景 */
  fontSize?: number
  fontFamily?: string
  color?: string
  textAlign?: 'left' | 'center' | 'right'
  /** 文本图层背景色，undefined 表示透明（不画背景矩形） */
  backgroundColor?: string
}

/**
 * 图片叠加节点（动态端口版）：
 * - 初始 2 个输入端口，每个端口接一张图
 * - 所有端口都被占满时，自动新增一个端口
 * - 图层顺序 = 端口顺序（layer-0 是底层，layer-1 在上面，依次类推）
 * - 每个图层可独立拖拽定位、四角拉伸缩放
 * - 输出合成后的 PNG（保留透明通道）
 *
 * 引擎侧职责「收信号 + 提交结果」：
 * - 端口 bindEdge → inputPortReceiveValue → 检测所有端口占满 → 自动 addInput
 * - 端口值更新 → 初始化 LayerState（natural 尺寸）→ notifyChanged → 触发合成
 * - 变换变更 → updateLayerTransform → notifyChanged → 触发合成
 */
export class ImageOverlayNode extends Node {
  static readonly TYPE = 'image-overlay'

  readonly type = ImageOverlayNode.TYPE

  /** 输出端口：合成后的 PNG 图片 */
  readonly imageOutput = new OutputPort('composite', ImgFileValue, {
    zh: '合成图',
    en: 'Composite',
    ja: '合成画像',
    ko: '합성 이미지',
    es: 'Compuesto',
    ar: 'صورة مركّبة',
    fr: 'Composite',
    pt: 'Composto',
    ru: 'Составное изображение',
    hi: 'संयुक्त छवि',
    id: 'Gambar gabungan',
    de: 'Zusammengesetztes Bild',
    vi: 'Ảnh tổng hợp',
    tr: 'Birleşik görüntü',
    it: 'Immagine composita'
  })

  /** 各端口 id 对应的 LayerState */
  private layerStates = new Map<string, LayerState>()

  /**
   * 用户显式设置的合成画布宽高。
   * -1 表示未设置，按所有图层的边界自动计算。
   */
  private canvasWidth: number = -1
  private canvasHeight: number = -1

  /**
   * 预览区的额外缩放倍数（1 = 100% = 不额外缩放，由 fitScale 自适应）。
   * 只有用户通过 - / + / 百分比按钮主动调整时才改，不随 box 尺寸自动算。
   */
  private previewZoomFactor: number = 1

  constructor(id: string) {
    super(id)
    // 初始 2 个端口，后续按需自动扩
    this.addLayerPort(0)
    this.addLayerPort(1)
    this.addOutput(this.imageOutput)
    // 内容区硬约束：大尺寸节点，左右双面板布局
    this.setBox(520, 380)
    // 默认固定画布尺寸 1920×1080（1080p），不再有"按图层边界自动撑大"模式
    this.canvasWidth = 1920
    this.canvasHeight = 1080
  }

  /** 创建并登记一个新的图层输入端口 */
  private addLayerPort(index: number): InputPort {
    const port = new InputPort(`layer-${index}`, {
      accepts: [ImgFileValue, StringValue],
      multiple: false,
      label: {
        zh: `图层 ${index + 1}`,
        en: `Layer ${index + 1}`,
        ja: `レイヤー ${index + 1}`,
        ko: `레이어 ${index + 1}`,
        es: `Capa ${index + 1}`,
        ar: `الطبقة ${index + 1}`,
        fr: `Calque ${index + 1}`,
        pt: `Camada ${index + 1}`,
        ru: `Слой ${index + 1}`,
        hi: `परत ${index + 1}`,
        id: `Lapisan ${index + 1}`,
        de: `Ebene ${index + 1}`,
        vi: `Lớp ${index + 1}`,
        tr: `Katman ${index + 1}`,
        it: `Livello ${index + 1}`
      }
    })
    this.addInput(port)
    return port
  }

  /**
   * 删除最后一个图层端口（只允许删尾部，避免 index 重排问题）。
   * 至少保留 1 个端口（返回 false 表示拒绝删除）。
   * 基类 removeInput 会自动断开 incoming 边 + notifyChanged。
   */
  removeLayerPort(portId: string): boolean {
    if (this.inputPorts.length <= 1) return false
    const last = this.inputPorts[this.inputPorts.length - 1]
    if (!last || last.id !== portId) return false // 只允许删尾部
    this.layerStates.delete(portId)
    this.removeInput(last)
    return true
  }

  // —— Node 基类要求 ——

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean { return false }
  onFileDrop(_sourcePath: string): void { /* 不接收文件 */ }
  isPositionAcceptNodeDrop(_source: Node): boolean { return false }
  onNodeDrop(_source: Node, _startPos: readonly [number, number]): boolean { return false }

  /**
   * 手动添加一个图层端口。新端口的 id 按当前数量递增，label 自动按 index 编号。
   */
  addLayer(): void {
    const nextIndex = this.inputPorts.length
    const port = this.addLayerPort(nextIndex)
    port.setLabel({
      zh: `图层 ${nextIndex + 1}`,
      en: `Layer ${nextIndex + 1}`,
      ja: `レイヤー ${nextIndex + 1}`,
      ko: `레이어 ${nextIndex + 1}`,
      es: `Capa ${nextIndex + 1}`,
      ar: `الطبقة ${nextIndex + 1}`,
      fr: `Calque ${nextIndex + 1}`,
      pt: `Camada ${nextIndex + 1}`,
      ru: `Слой ${nextIndex + 1}`,
      hi: `परत ${nextIndex + 1}`,
      id: `Lapisan ${nextIndex + 1}`,
      de: `Ebene ${nextIndex + 1}`,
      vi: `Lớp ${nextIndex + 1}`,
      tr: `Katman ${nextIndex + 1}`,
      it: `Livello ${nextIndex + 1}`
    })
  }

  /**
   * 输入端口事件统一入口：
   * - 值更新 / 断边：刷新 LayerState（新边初始化，旧边保留用户调整）
   */
  inputPortReceiveValue(_ports: InputPort[]): void {
    // 同步 LayerState：新端口（或新绑边）初始化，已有的不动
    for (const port of this.inputPorts) {
      const edge = port.incoming.keys().next().value as Edge | undefined
      if (!edge) continue
      const value = port.incoming.get(edge)
      let kind: 'image' | 'text'
      if (value instanceof StringValue) kind = 'text'
      else if (value instanceof ImgFileValue) kind = 'image'
      else continue
      if (!this.layerStates.has(port.id)) {
        this.layerStates.set(port.id, {
          kind,
          x: 0, y: 0, width: 0, height: 0, initialized: false,
          fontSize: kind === 'text' ? 48 : undefined,
          fontFamily: kind === 'text' ? 'sans-serif' : undefined,
          color: kind === 'text' ? '#000000' : undefined,
          textAlign: kind === 'text' ? 'left' : undefined,
          backgroundColor: undefined
        })
      } else {
        // 端口之前已存在 state，但如果 value 类型变了（image↔text），同步更新 kind
        const existing = this.layerStates.get(port.id)!
        if (existing.kind !== kind) {
          this.layerStates.set(port.id, {
            ...existing,
            kind,
            // 切类型时清理不属于新类型的字段，同时让 refreshLayers 重新测尺寸
            initialized: false,
            fontSize: kind === 'text' ? (existing.fontSize ?? 48) : undefined,
            fontFamily: kind === 'text' ? (existing.fontFamily ?? 'sans-serif') : undefined,
            color: kind === 'text' ? (existing.color ?? '#000000') : undefined,
            textAlign: kind === 'text' ? (existing.textAlign ?? 'left') : undefined,
            backgroundColor: kind === 'text' ? existing.backgroundColor : undefined
          })
        }
      }
    }

    this.notifyChanged()
  }

  // —— LayerState 管理 ——

  /** 更新某层的变换参数（key 是端口 id） */
  updateLayerTransform(portId: string, partial: Partial<LayerState>): void {
    const existing = this.layerStates.get(portId)
    if (!existing) return
    const updated: LayerState = { ...existing, ...partial }
    if (updated.width < 1) updated.width = 1
    if (updated.height < 1) updated.height = 1
    // 值没真变就不 notify——防止 refreshLayers 的 sync watcher 死循环：
    // 同端口换值 → shouldResetDims=true → updateLayerTransform → notifyChanged →
    // 递归 refreshLayers 读到旧 layers.value → shouldResetDims 依然 true → 循环。
    if (updated.width === existing.width
      && updated.height === existing.height
      && updated.x === existing.x
      && updated.y === existing.y
      && updated.initialized === existing.initialized
      && updated.kind === existing.kind
      && updated.fontSize === existing.fontSize
      && updated.fontFamily === existing.fontFamily
      && updated.color === existing.color
      && updated.textAlign === existing.textAlign
      && updated.backgroundColor === existing.backgroundColor) {
      return
    }
    this.layerStates.set(portId, updated)
    this.notifyChanged()
  }

  // —— 画布尺寸设置 ——

  /** 当前画布配置宽度，-1 表示自动 */
  get configuredCanvasWidth(): number { return this.canvasWidth }
  /** 当前画布配置高度，-1 表示自动 */
  get configuredCanvasHeight(): number { return this.canvasHeight }

  /** 设置画布宽高（必须 > 0） */
  setCanvasSize(width: number, height: number): void {
    const w = Math.max(1, Math.round(width))
    const h = Math.max(1, Math.round(height))
    if (w === this.canvasWidth && h === this.canvasHeight) return
    this.canvasWidth = w
    this.canvasHeight = h
    this.notifyChanged()
  }

  /** 重置画布宽高为自动（按图层边界算） */
  resetCanvasSize(): void {
    if (this.canvasWidth === -1 && this.canvasHeight === -1) return
    this.canvasWidth = -1
    this.canvasHeight = -1
    this.notifyChanged()
  }

  // —— 预览区缩放 ——

  /** 预览区额外缩放倍数（1 = 纯自适应，不额外放大缩小） */
  get zoomFactor(): number { return this.previewZoomFactor }

  /** 调整预览区额外缩放倍数。会 notifyChanged → debounce 落库。 */
  setZoomFactor(factor: number): void {
    const f = Math.max(0.1, Math.min(8, factor))
    if (Math.abs(f - this.previewZoomFactor) < 0.001) return
    this.previewZoomFactor = f
    this.notifyChanged()
  }

  /** 获取某端口的 LayerState */
  getLayerState(portId: string): LayerState | undefined {
    return this.layerStates.get(portId)
  }

  /** 图层数（= 端口数） */
  get layerCount(): number {
    return this.inputPorts.length
  }

  /**
   * 所有已连接图层的绘制指令，按端口顺序排列。
   * layer-0 是数组首元素（最底层），依次类推。
   */
  get layerDrawOrders(): ReadonlyArray<{
    portId: string
    state: LayerState
    value: LayerValue
  }> {
    const result: { portId: string; state: LayerState; value: LayerValue }[] = []
    for (const port of this.inputPorts) {
      const edge = port.incoming.keys().next().value as Edge | undefined
      if (!edge) continue
      const value = port.incoming.get(edge)
      const state = this.layerStates.get(port.id)
      if ((value instanceof ImgFileValue || value instanceof StringValue) && state) {
        result.push({ portId: port.id, state, value })
      }
    }
    return result
  }

  /**
   * 计算合成画布尺寸：
   * - 用户显式设置了 canvasWidth/canvasHeight → 用设置值
   * - 否则取所有图层右边界/下边界的最大值
   */
  get compositeCanvasSize(): { width: number; height: number } {
    if (this.canvasWidth > 0 && this.canvasHeight > 0) {
      return { width: this.canvasWidth, height: this.canvasHeight }
    }
    let maxRight = 0
    let maxBottom = 0
    for (const { state } of this.layerDrawOrders) {
      const right = state.x + state.width
      const bottom = state.y + state.height
      if (right > maxRight) maxRight = right
      if (bottom > maxBottom) maxBottom = bottom
    }
    return { width: Math.max(1, maxRight), height: Math.max(1, maxBottom) }
  }

  /** 合成去重用的 compositeKey：画布尺寸 + 各端口值 fingerprint + 变换参数 + 文本样式 */
  get compositeKey(): string | null {
    const orders = this.layerDrawOrders
    if (orders.length === 0) return null
    const parts: string[] = [`canvas:${this.canvasWidth},${this.canvasHeight}`]
    for (const o of orders) {
      const s = o.state
      // kind 从 value 类型推导（不用 s.kind，它可能过时——比如端口先连图片后换文字但 state 没更新）
      const isText = o.value instanceof StringValue
      const kind = isText ? 'text' : 'image'
      let layerPart = `${o.portId}:${kind}:${o.value.fingerprint}:${s.x},${s.y},${s.width},${s.height}`
      if (isText) {
        layerPart += `,fs:${s.fontSize ?? 48},ff:${s.fontFamily ?? 'sans-serif'},c:${s.color ?? '#000000'},ta:${s.textAlign ?? 'left'},bg:${s.backgroundColor ?? '-'}`
      }
      parts.push(layerPart)
    }
    return parts.join('|')
  }

  get lastCompositeK(): string | null { return this.lastCompositeKey }
  markComposite(key: string): void { this.lastCompositeKey = key }

  setOutput(base64: string, fileName: string): void {
    const bytes = base64ToBytes(base64)
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const file = new File([ab], fileName, { type: 'image/png' })
    const hash = djb2(base64)
    this.imageOutput.commit(new ImgFileValue(file, hash))
    this.notifyChanged()
  }

  private lastCompositeKey: string | null = null

  // —— 序列化 ——

  saveState(): Record<string, unknown> {
    const states: Record<string, LayerState> = {}
    this.layerStates.forEach((v, k) => { states[k] = { ...v } })
    const [w, h] = this.box
    return {
      box: [w, h],
      zoomFactor: this.previewZoomFactor,
      portCount: this.inputPorts.length,
      layerStates: states,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight
    }
  }

  readState(state: Record<string, unknown>): void {
    const savedCount = typeof state.portCount === 'number' ? state.portCount : 2
    const rawStates = (state.layerStates as Record<string, Partial<LayerState>>) ?? {}
    const savedCW = typeof state.canvasWidth === 'number' && state.canvasWidth > 0
      ? state.canvasWidth : 1920
    const savedCH = typeof state.canvasHeight === 'number' && state.canvasHeight > 0
      ? state.canvasHeight : 1080
    const savedBox = state.box as [number, number] | undefined
    const savedZoom = typeof state.zoomFactor === 'number' ? state.zoomFactor : undefined

    this.canvasWidth = savedCW
    this.canvasHeight = savedCH

    // 恢复节点整体 box（render.vue 右下角 resize 手柄调整的内容区大小）
    if (Array.isArray(savedBox) && savedBox.length === 2) {
      this.setBox(savedBox[0], savedBox[1])
    }

    // 恢复预览区额外缩放（老数据没有就保持默认 1）
    if (savedZoom !== undefined) {
      this.previewZoomFactor = Math.max(0.1, Math.min(8, savedZoom))
    }

    // 清掉构造时创建的默认端口，按保存的数量重建
    const existing = [...this.inputPorts]
    for (const p of existing) {
      this.removeInput(p)
    }
    for (let i = 0; i < savedCount; i++) {
      this.addLayerPort(i)
    }

    // 恢复 LayerState（老数据没有 kind 字段，默认当作 image）
    this.layerStates.clear()
    for (const [k, v] of Object.entries(rawStates)) {
      const kind = v.kind ?? 'image'
      this.layerStates.set(k, {
        kind,
        x: v.x ?? 0,
        y: v.y ?? 0,
        width: v.width ?? 0,
        height: v.height ?? 0,
        initialized: v.initialized ?? false,
        fontSize: v.fontSize,
        fontFamily: v.fontFamily,
        color: v.color,
        textAlign: v.textAlign,
        backgroundColor: v.backgroundColor
      })
    }
  }
}
