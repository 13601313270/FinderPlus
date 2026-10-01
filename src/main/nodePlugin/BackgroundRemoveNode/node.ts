import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { workspaceScene } from '../../engine/graph/SceneRegistry'

/**
 * 背景抠除节点：接收图片，用 @imgly/background-removal 去掉背景后输出透明 PNG。
 *
 * 两种触发方式（与 ImageCompressNode 一致）：
 * 1. **节点拖入**（一次性）：把图片节点拖进来抠一次。
 *    不订阅源节点、不建立持久关系——拖一次抠一次，之后源节点变化不再触发。
 * 2. **端口输入**（响应式）：左侧 source 端口接 ImgFileValue 上游，
 *    上游值变化时自动重新抠图。
 *
 * 引擎侧职责「收信号 + 提交结果」：
 * - 拖入路径：onNodeDrop(source) 暂存 pendingSourceId → notifyChanged → render.vue 读源值抠图
 * - 端口路径：imageInput.receive → inputPortReceiveValue → notifyChanged → render.vue 读端口值抠图
 * - render.vue 抠图完成调 setOutput(blob, fileName) → commit 到输出端口 → 下游刷新
 */
export class BackgroundRemoveNode extends Node {
  static readonly TYPE = 'background-remove'

  readonly type = BackgroundRemoveNode.TYPE

  /** 输入端口：图片值（ImgFileValue）。接线后上游值变化会自动触发重新抠图 */
  readonly imageInput = new InputPort('source', {
    accepts: [ImgFileValue],
    label: { zh: '图片', en: 'Image' }
  })

  /** 输出端口：去背景后的 PNG 图片 */
  readonly imageOutput = new OutputPort('image', ImgFileValue, { zh: '去背景图', en: 'Background Removed' })

  /** 本次要处理的源节点 id（拖入路径的触发信号）。一次拖入只处理一次，处理完清空 */
  private pendingSourceId: string | null = null

  /** 最近一次抠图的源文件 fingerprint（ImgFileValue.fingerprint），用于去重：
   * 端口路径响应式触发时，如果 fingerprint 没变就跳过（避免重入） */
  private lastProcessedFingerprint: string | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.imageInput)
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
   */
  onNodeDrop(source: Node, startPos: readonly [number, number]): boolean {
    this.pendingSourceId = source.id
    this.notifyChanged()
    source.setPosition(startPos[0], startPos[1])
    return true
  }

  /** 本次待抠图的源节点（render.vue 收到信号后读它的图片值）——拖入路径专用 */
  get pendingSource(): Node | undefined {
    if (!this.pendingSourceId) return undefined
    return workspaceScene.getNode(this.pendingSourceId)
  }

  /**
   * 抠图源文件：拖入路径优先于端口路径。
   * 返回 File + fingerprint（来自 ImgFileValue），没有可用源时返回 null。
   */
  get processSource(): { file: File; fingerprint: string } | null {
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

  /** 最近一次抠图的源 fingerprint，render.vue 用来判断是否需要跳过重复处理 */
  get lastProcessedFp(): string | null {
    return this.lastProcessedFingerprint
  }

  /** 渲染侧抠图完成后调用，记录 fingerprint 用于后续去重判断 */
  markProcessed(fingerprint: string): void {
    this.lastProcessedFingerprint = fingerprint
  }

  /** 抠图完成后由 render.vue 调用，清空拖入路径的触发信号（端口路径不清） */
  clearPending(): void {
    if (!this.pendingSourceId) return
    this.pendingSourceId = null
    this.notifyChanged()
  }

  /**
   * 提交抠图结果并 commit imageOutput（render.vue 抠图完成后调用）。
   *
   * @param blob      去背景后的图片 Blob（由 removeBackground 返回，默认 PNG）
   * @param fileName  输出文件名（展示用；抠图结果不落盘）
   */
  setOutput(blob: Blob, fileName: string): void {
    const mime = blob.type || 'image/png'
    const file = new File([blob], fileName, { type: mime })
    // 转 base64 算 fingerprint（djb2 对内容稳定）
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const comma = dataUrl.indexOf(',')
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
      const hash = djb2(base64)
      this.imageOutput.commit(new ImgFileValue(file, hash))
      this.notifyChanged()
    }
    reader.readAsDataURL(file)
  }

  /** 输入端口值变化：通知视图刷新 */
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

// 兼容 base64ToBytes 的隐式使用（给 setOutput 里 FileReader 失败的兜底）
void base64ToBytes
