import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { workspaceScene } from '../../engine/graph/SceneRegistry'

/**
 * 图片压缩节点：把拖进来的图片节点（输出 ImgFileValue 的节点）的图片压缩一次。
 *
 * 节点拖入是一次性工作——不订阅源节点、不建立持久关系、不持久化状态：
 * 拖一次压一次，之后源节点怎么变都不再触发；画布恢复后也不自动重压。
 *
 * 目标尺寸来自 size 输入端口（NumberValue，最长边像素）；未接线时用默认值。
 * 尺寸在 drop 那一刻读取——改尺寸不会重压已压缩的结果，等下次拖入生效。
 *
 * 引擎侧职责「收信号 + 提交结果」：
 * - onNodeDrop(source) 把本次要处理的源节点 id 暂存为 pendingSourceId（触发信号）+ notifyChanged
 * - render.vue 收到信号后读源节点当前图片值，用 <canvas> 压缩（浏览器侧，引擎不碰字节），
 *   压缩完成调 setOutput(base64, mime, fileName) → 这里 commit 到输出端口 → 下游刷新
 * - render.vue 干完活调 clearPending() 重置触发信号
 */
export class ImageCompressNode extends Node {
  static readonly TYPE = 'image-compress'

  readonly type = ImageCompressNode.TYPE

  /** 输入端口：目标尺寸（最长边像素，NumberValue）。未接线用端口 defaultValue */
  readonly sizeInput = new InputPort('size', {
    accepts: [NumberValue],
    label: '尺寸',
    defaultValue: new NumberValue(800)
  })

  /** 输出端口：压缩后的图片 */
  readonly imageOutput = new OutputPort('image', ImgFileValue, '压缩图')

  /** 本次要处理的源节点 id（触发信号）。一次拖入只处理一次，处理完清空 */
  private pendingSourceId: string | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.sizeInput)
    this.addOutput(this.imageOutput)
    // 内容区硬约束：头部标签 + 预览区 + 底部提示栏
    this.setBox(240, 228)
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

  /** 本次待压缩的源节点（render.vue 收到信号后读它的图片值） */
  get pendingSource(): Node | undefined {
    if (!this.pendingSourceId) return undefined
    return workspaceScene.getNode(this.pendingSourceId)
  }

  /**
   * 目标尺寸（最长边像素）：来自 size 输入端口；未接线/值非法时用默认值。
   * 压缩时读它——一次性语义下改尺寸不重压已有结果，等下次拖入生效。
   */
  get targetSize(): number {
    const [first] = this.sizeInput.value
    if (first instanceof NumberValue) {
      const v = Math.round(first.value)
      if (Number.isFinite(v) && v > 0) return v
    }
    return 800 // 兜底，理论上 effectiveValue 总会命中 defaultValue
  }

  /** 压缩完成后由 render.vue 调用，清空触发信号 */
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
    this.notifyChanged()
  }

  /** 输入端口变化（尺寸值/断边）：通知视图刷新展示；不触发重压 */
  inputPortReceiveValue(_ports: InputPort[]): void {
    this.notifyChanged()
  }

  /** 一次性工作：无持久状态，恢复后不自动重压 */
  saveState(): Record<string, unknown> {
    return {}
  }

  readState(_state: Record<string, unknown>): void {
    // 啥也不做——等用户再拖一次
  }
}
