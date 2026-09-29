import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/**
 * 图片叠加节点：接收多张图片，按连接顺序叠加（先连的在底层，后连的在上层），
 * 输出一张合成后的 PNG 图片（保留透明通道）。
 *
 * 画布尺寸 = 所有图层中的最大宽 × 最大高，每层按原始尺寸从 (0, 0) 开始绘制。
 * 如果某层比画布小，该层右侧/下侧会有透明区域；如果比画布大，超出部分会被裁切。
 *
 * 响应式触发：任一输入端口的值变化（新增/移除/更新）都会自动重新合成。
 *
 * 引擎侧职责「收信号 + 提交结果」：
 * - 端口路径：input.receive / bindEdge / unbindEdge → inputPortReceiveValue → notifyChanged
 *   → render.vue 收集所有图层 → canvas 叠绘 → setOutput → commit 到输出端口 → 下游刷新
 */
export class ImageOverlayNode extends Node {
  static readonly TYPE = 'image-overlay'

  readonly type = ImageOverlayNode.TYPE

  /** 输入端口：多层图片（ImgFileValue）。multiple=true 允许多条连线，
   * 连接顺序即层级顺序（先连=底层，后连=上层） */
  readonly layersInput = new InputPort('layers', {
    accepts: [ImgFileValue],
    multiple: true,
    label: '图层'
  })

  /** 输出端口：合成后的 PNG 图片 */
  readonly imageOutput = new OutputPort('composite', ImgFileValue, '合成图')

  /** 最近一次合成的所有源 fingerprint 拼接（用 '|' 分隔），用于去重：
   * 所有输入 fingerprint 没变就跳过（避免重入） */
  private lastCompositeFingerprint: string | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.layersInput)
    this.addOutput(this.imageOutput)
    // 内容区硬约束：头部标签 + 预览区 + 底部提示栏
    this.setBox(260, 248)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收外部文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 接受判定：暂不支持节点拖入叠加，所有图层通过端口连接 */
  isPositionAcceptNodeDrop(_source: Node): boolean {
    return false
  }

  onNodeDrop(_source: Node, _startPos: readonly [number, number]): boolean {
    return false
  }

  /**
   * 当前所有图层的 ImgFileValue 列表，按连接顺序排列。
   * JS Map 保持插入顺序，所以 incoming Map 的遍历顺序 = 用户连线顺序 = 层级顺序。
   */
  get layerValues(): readonly ImgFileValue[] {
    const result: ImgFileValue[] = []
    this.layersInput.value.forEach((v) => {
      if (v instanceof ImgFileValue) result.push(v)
    })
    return result
  }

  /**
   * 当前所有图层的 fingerprint 拼接字符串，用于去重。
   * 只要有任何一个图层的 fingerprint 变了（或数量变了），这个字符串就会变。
   */
  get currentLayersFingerprint(): string | null {
    const values = this.layerValues
    if (values.length === 0) return null
    return values.map((v) => v.fingerprint).join('|')
  }

  /** 最近一次合成时的图层 fingerprint 拼接，render.vue 用来判断是否需要跳过重复合成 */
  get lastCompositeFp(): string | null {
    return this.lastCompositeFingerprint
  }

  /** 渲染侧合成完成后调用，记录 fingerprint 用于后续去重判断 */
  markComposite(fingerprint: string): void {
    this.lastCompositeFingerprint = fingerprint
  }

  /**
   * 提交合成结果并 commit imageOutput（render.vue 合成完成后调用）。
   *
   * @param base64   合成图二进制的 base64 编码（canvas.toDataURL 抽取）
   * @param fileName 合成图文件名（展示用；结果不落盘）
   */
  setOutput(base64: string, fileName: string): void {
    const bytes = base64ToBytes(base64)
    // 显式取 slice 后的纯 ArrayBuffer，避免 TS 5.x 把 Uint8Array<ArrayBufferLike> 卡在 File 构造上
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const file = new File([ab], fileName, { type: 'image/png' })
    const hash = djb2(base64)
    this.imageOutput.commit(new ImgFileValue(file, hash))
    this.notifyChanged()
  }

  /**
   * 输入端口值变化：通知视图刷新。
   * 图层值变化 → render.vue 收到通知后会检查 fingerprint，触发合成
   */
  inputPortReceiveValue(_ports: InputPort[]): void {
    this.notifyChanged()
  }

  /** 连接状态变化（bind/unbind）也要触发重合成 */
  // 注意：InputPort.bindEdge / unbindEdge 内部会调 owner.inputPortReceiveValue，
  // 所以上面的方法已经覆盖了连接变化的情况，无需额外处理。

  /** 图层顺序（连接顺序）不持久化——恢复后端口重新连接会自动按新的连接顺序生效 */
  saveState(): Record<string, unknown> {
    return {}
  }

  readState(_state: Record<string, unknown>): void {
    // 啥也不做——等端口重新连上上游
  }
}
