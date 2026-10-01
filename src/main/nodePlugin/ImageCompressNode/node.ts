import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { workspaceScene } from '../../engine/graph/SceneRegistry'

/**
 * 图片压缩节点：接收图片并压缩输出。
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
 * 引擎侧职责「收信号 + 提交结果」：
 * - 拖入路径：onNodeDrop(source) 暂存 pendingSourceId → notifyChanged → render.vue 读源值压缩
 * - 端口路径：imageInput.receive → inputPortReceiveValue → notifyChanged → render.vue 读端口值压缩
 * - render.vue 压缩完成调 setOutput(base64, mime, fileName) → commit 到输出端口 → 下游刷新
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

  /** 输入端口：图片值（ImgFileValue）。接线后上游值变化会自动触发重新压缩 */
  readonly imageInput = new InputPort('source', {
    accepts: [ImgFileValue],
    label: '图片'
  })

  /** 输出端口：压缩后的图片 */
  readonly imageOutput = new OutputPort('image', ImgFileValue, '压缩图')

  /** 本次要处理的源节点 id（拖入路径的触发信号）。一次拖入只处理一次，处理完清空 */
  private pendingSourceId: string | null = null

  /** 最近一次压缩的源文件 fingerprint（ImgFileValue.fingerprint），用于去重：
   * 端口路径响应式触发时，如果 fingerprint 没变就跳过（避免重入） */
  private lastCompressedFingerprint: string | null = null

  /** 最近一次压缩时的 targetSize（最长边像素），尺寸变化也要重压 */
  private lastCompressedSize: number | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.sizeInput)
    this.addInput(this.imageInput)
    this.addOutput(this.imageOutput)
    // 内容区硬约束：头部标签 + 预览区 + 底部提示栏
    this.setBox(250, 230)
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

  /** 最近一次压缩的源 fingerprint，render.vue 用来判断是否需要跳过重复压缩 */
  get lastCompressedFp(): string | null {
    return this.lastCompressedFingerprint
  }

  /** 最近一次压缩时的 targetSize，render.vue 用来判断尺寸变了是否要重压 */
  get lastCompressedSz(): number | null {
    return this.lastCompressedSize
  }

  /** 渲染侧压缩完成后调用，同时记录 fingerprint 和 size，用于后续去重判断 */
  markCompressed(fingerprint: string, size: number): void {
    this.lastCompressedFingerprint = fingerprint
    this.lastCompressedSize = size
  }

  /**
   * 目标尺寸（最长边像素）：来自 size 输入端口；未接线/值非法时用默认值。
   * 压缩时读它——改尺寸只刷新 UI 展示，不自动重压已有结果，等下次触发（拖入或端口值变）生效。
   */
  get targetSize(): number {
    const [first] = this.sizeInput.value
    if (first instanceof NumberValue) {
      const v = Math.round(first.value)
      if (Number.isFinite(v) && v > 0) return v
    }
    return 800 // 兜底，理论上 effectiveValue 总会命中 defaultValue
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
    this.notifyChanged()
  }

  /**
   * 输入端口值变化：通知视图刷新。
   * - imageInput 变化 → render.vue 收到通知后会检查 compressSource，触发压缩（端口路径响应式）
   * - sizeInput 变化 → render.vue 只刷新尺寸展示，不自动重压已有结果
   */
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
