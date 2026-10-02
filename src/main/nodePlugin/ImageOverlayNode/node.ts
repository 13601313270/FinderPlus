import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { Edge } from '../../engine/graph/Edge'

/**
 * 单层变换状态：key 是 InputPort.id（'layer-0', 'layer-1', ...）。
 * 坐标系是最终合成画布的像素坐标系，(0, 0) 为画布左上角。
 */
export interface LayerState {
  x: number
  y: number
  width: number
  height: number
  /** 是否已用真实 natural 尺寸初始化过（false = 占位值，允许自动覆盖；
   *  true = 用户可能已手动调整，不再自动覆盖） */
  initialized: boolean
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

  constructor(id: string) {
    super(id)
    // 初始 2 个端口，后续按需自动扩
    this.addLayerPort(0)
    this.addLayerPort(1)
    this.addOutput(this.imageOutput)
    // 内容区硬约束：大尺寸节点，左右双面板布局
    this.setBox(520, 380)
  }

  /** 创建并登记一个新的图层输入端口 */
  private addLayerPort(index: number): InputPort {
    const port = new InputPort(`layer-${index}`, {
      accepts: [ImgFileValue],
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
      if (!(value instanceof ImgFileValue)) continue
      if (!this.layerStates.has(port.id)) {
        this.layerStates.set(port.id, {
          x: 0, y: 0, width: 0, height: 0, initialized: false
        })
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
    value: ImgFileValue
  }> {
    const result: { portId: string; state: LayerState; value: ImgFileValue }[] = []
    for (const port of this.inputPorts) {
      const edge = port.incoming.keys().next().value as Edge | undefined
      if (!edge) continue
      const value = port.incoming.get(edge)
      const state = this.layerStates.get(port.id)
      if (value instanceof ImgFileValue && state) {
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

  /** 合成去重用的 compositeKey：画布尺寸 + 各端口值 fingerprint + 变换参数 */
  get compositeKey(): string | null {
    const orders = this.layerDrawOrders
    if (orders.length === 0) return null
    const parts: string[] = [`canvas:${this.canvasWidth},${this.canvasHeight}`]
    for (const o of orders) {
      parts.push(`${o.portId}:${o.value.fingerprint}:${o.state.x},${o.state.y},${o.state.width},${o.state.height}`)
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
    return {
      portCount: this.inputPorts.length,
      layerStates: states,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight
    }
  }

  readState(state: Record<string, unknown>): void {
    const savedCount = typeof state.portCount === 'number' ? state.portCount : 2
    const savedStates = (state.layerStates as Record<string, LayerState>) ?? {}
    const savedCW = typeof state.canvasWidth === 'number' ? state.canvasWidth : -1
    const savedCH = typeof state.canvasHeight === 'number' ? state.canvasHeight : -1

    this.canvasWidth = savedCW
    this.canvasHeight = savedCH

    // 清掉构造时创建的默认端口，按保存的数量重建
    const existing = [...this.inputPorts]
    for (const p of existing) {
      this.removeInput(p)
    }
    for (let i = 0; i < savedCount; i++) {
      this.addLayerPort(i)
    }

    // 恢复 LayerState
    this.layerStates.clear()
    for (const [k, v] of Object.entries(savedStates)) {
      this.layerStates.set(k, { ...v })
    }
  }
}
