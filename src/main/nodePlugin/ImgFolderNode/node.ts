import type { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'
import type { Scene } from '../../engine/graph/Scene'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { FolderNode } from '../FolderNode/node'
import { ImgFileNode } from '../ImgFileNode/node'

/** 取文件名后缀（含点、小写）；无扩展名返回空串 */
function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

/**
 * 图片文件夹节点：结构与 FolderNode 一致（同一扁平 Scene 收养、局部坐标、DOM 嵌套渲染），
 * 但有两点不同：
 *
 * 1. **只收养图片节点**——节点拖入 / 文件拖入 / 端口收值三条入口都限制为图片，
 *    子节点恒为 ImgFileNode。
 * 2. **多了一个图片输出端口**——用户点击切换选中的那张图片，被选中图片的
 *    ImgFileValue 就从这个端口送出去（下游连边即可拿到「当前选中的图」）。
 *
 * 选中态是本节点自己的内部状态（selectedChildId），与全局节点选中无关：
 * render.vue 在 pointerdown 捕获阶段命中子节点后调 selectChild() 切换。
 * 选中项变化（或选中图片内容被替换 / 异步读回）时把它的 fileOutput 值提交到
 * imageOutput；没有选中项时调 imageOutput.clear() 让下游清空。
 */
export class ImgFolderNode extends FolderNode {
  static readonly TYPE = 'img-folder'
  readonly type: string = ImgFolderNode.TYPE

  /** 图片输出端口：当前选中子图片的 ImgFileValue */
  readonly imageOutput = new OutputPort('image', ImgFileValue, { zh: '选中图片', en: 'Selected Image' })

  /** 当前选中的子节点 id；空串表示未选中 */
  private selectedChildIdValue = ''

  /** 选中子节点的 onChanged 订阅：选中图片内容变化（异步读回 / 被替换）时重提值 */
  private selectedChildUnsub?: () => void

  /** 持久化期间暂存的待恢复选中 id（readState 存、adoptChildren 收尾时应用） */
  private pendingSelectedChildId = ''

  constructor(id: string) {
    super(id)
    this.addOutput(this.imageOutput)
  }

  /** 当前选中的子节点 id；空串表示未选中 */
  get selectedChildId(): string {
    return this.selectedChildIdValue
  }

  // —— 选中 / 输出 ——

  /**
   * 切换到指定子节点（必须是本文件夹已收养的图片节点）。
   * 切换后重订阅该子节点、重新提交输出值并通知 UI 刷新选中高亮。
   */
  selectChild(id: string): void {
    if (id === this.selectedChildIdValue) return
    const child = this.children.find((c) => c.id === id)
    if (!(child instanceof ImgFileNode)) return
    this.selectedChildIdValue = id
    this.resubscribeSelected(child)
    this.commitSelected()
    this.notifyChanged()
  }

  /** 订阅当前选中子节点的变化；切换 / 释放时先退订旧的 */
  private resubscribeSelected(child: Node | undefined): void {
    this.selectedChildUnsub?.()
    this.selectedChildUnsub = undefined
    if (child) {
      this.selectedChildUnsub = child.onChanged(() => this.commitSelected())
    }
  }

  /** 把选中子图片的 fileOutput 值提交到 imageOutput；无有效值则清空下游 */
  private commitSelected(): void {
    const child = this.children.find((c) => c.id === this.selectedChildIdValue)
    const value = child instanceof ImgFileNode ? child.fileOutput.value : undefined
    if (value instanceof ImgFileValue) {
      this.imageOutput.commit(value)
    } else {
      this.imageOutput.clear()
    }
  }

  // —— 收养入口收紧为「仅图片」 ——

  /** 只收养图片节点；首个被收养的子节点自动选中 */
  override adoptNode(child: Node): void {
    if (!(child instanceof ImgFileNode)) return
    super.adoptNode(child)
    if (!this.selectedChildIdValue) {
      this.selectChild(child.id)
    }
  }

  /** 端口收值：只接受图片值，其余走超类流程会产生非图片子节点，直接拦截 */
  override async inputPortReceiveValue(ports: InputPort[]): Promise<void> {
    const [first] = this.fileInput.value
    if (!(first instanceof ImgFileValue)) return
    await super.inputPortReceiveValue(ports)
  }

  /** 文件拖入：仅图片后缀才继续（超类会复制文件并构造对应的文件子节点） */
  override async onFileDrop(sourcePath: string): Promise<void> {
    if (!ImgFileNode.acceptsExtension(extOf(sourcePath))) return
    await super.onFileDrop(sourcePath)
  }

  /** 节点拖入：只接受图片节点（超类判定为「未被收养的文件节点」） */
  override isPositionAcceptNodeDrop(source: Node): boolean {
    if (!(source instanceof ImgFileNode)) return false
    return super.isPositionAcceptNodeDrop(source)
  }

  /** 释放子节点：若释放的正是选中项，退订并回退到下一个子节点（没有则清空输出） */
  override removeChild(child: Node): void {
    super.removeChild(child)
    if (child.id !== this.selectedChildIdValue) return
    this.selectedChildIdValue = ''
    this.resubscribeSelected(undefined)
    const next = this.children[0]
    if (next) {
      this.selectChild(next.id)
    } else {
      this.imageOutput.clear()
      this.notifyChanged()
    }
  }

  // —— 持久化 ——

  override saveState(): Record<string, unknown> {
    return { ...super.saveState(), selectedChildId: this.selectedChildIdValue }
  }

  override readState(state: Record<string, unknown>): void {
    super.readState(state)
    const selected = state.selectedChildId
    this.pendingSelectedChildId = typeof selected === 'string' ? selected : ''
  }

  /** 恢复收尾：先收养子节点，再应用暂存的选中项（无效则回退到第一个子节点） */
  override adoptChildren(scene: Scene): void {
    super.adoptChildren(scene)
    const wanted = this.children.find((c) => c.id === this.pendingSelectedChildId)
    const target = wanted ?? this.children[0]
    if (target) this.selectChild(target.id)
    this.pendingSelectedChildId = ''
  }

  override async beforeDestroy(): Promise<void> {
    this.resubscribeSelected(undefined)
    await super.beforeDestroy()
  }
}