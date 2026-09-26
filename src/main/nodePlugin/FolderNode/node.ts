import { Node } from '../../engine/node/Node'
import { InputPort } from '../../engine/port/InputPort'
import type { Scene } from '../../engine/graph/Scene'
import { FileValue } from '../../engine/data/FileValue'
import { TxtFileValue } from '../../engine/data/TxtFileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { FileNode } from '../FileNode/node'
import { resolveByExtension } from '../index'
import { workspaceScene } from '../../engine/graph/SceneRegistry'

/**
 * 栅格常量：文件夹内容区内槽位横竖方向都占一格。
 * 内容区尺寸由槽位数推导：w = PADDING*2 + cols*(SLOT_W+GAP) - GAP，h 同理。
 * 最小 2×2：MIN_W = MIN_H = PADDING*2 + 2*(SLOT_W+GAP) - GAP ≈ 232。
 *
 * 说明：文件夹本身的宽高（node.box）就是「视觉框」的大小，槽位排布据此推算——
 * 子节点只按 index 放进格子，不在框内时（少见过大）靠拖出释放来兜底，不强行改框。
 */
export const SLOT_W = 96
export const SLOT_H = 96
export const GAP = 12
export const PADDING = 20
/** 顶部横栏（可拖动文件夹的标题栏）高度，槽位内容区从这里下方起算 */
export const BAR_H = 22
/** 内容区最小宽高（2×2 槽位），resize 时钳制，保证至少摆得下 2×2 图标 */
export const MIN_W = PADDING * 2 + 2 * (SLOT_W + GAP) - GAP
export const MIN_H = BAR_H + PADDING * 2 + 2 * (SLOT_H + GAP) - GAP

/** 取文件名后缀（含点、小写）；无扩展名返回空串 */
function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

/**
 * 文件夹容器节点：把若干文件/节点收纳进去，统一管理尺寸与摆放。
 *
 * 容器模型 = 同一扁平 Scene 收养：子节点仍是 workspaceScene 里的真实节点，
 * 通过 containerNode 标记归属到本文件夹，其 position 存的是**相对本文件夹的局部坐标**，
 * 靠 DOM 嵌套让浏览器把本文件夹的世界坐标与子节点局部坐标逐级累加渲染；
 * 几何/命中测量需要世界坐标时读 `worldPosition`（引擎沿容器链累加，不手搓 offset）。
 * 边按端口对象引用连接，与坐标/归属无关，因此收养/释放都不会破坏任何已有 Edge ——
 * 这正是「拖进去后原边保持可用」的保证。
 *
 * 纯 UI 组合功能——节点还是那个节点、文件还是那个文件。文件夹**不落盘、不复制、
 * 不重建 Value**：收养一律基于「已有文件节点」或「已有文件值」。文件字节的复制
 * 仍只在「正常创建文件节点」时走既有 copyPath 路径（App 层），节点类不碰 IPC。
 */
export class FolderNode extends Node {
  static readonly TYPE = 'folder'
  readonly type = FolderNode.TYPE

  /** 输入端口：接收文件类 Value，收到后文件夹内新建对应文件子节点（收养元素源自值） */
  readonly fileInput = new InputPort('file', {
    accepts: [FileValue, TxtFileValue, ImgFileValue],
    label: '文件'
  })

  /** 已收养的子节点（顺序即槽位排布顺序）。子节点仍是 Scene 里的顶层节点，只是归属这里 */
  readonly children: Node[] = []

  /** 持久化期间暂存的待收养子节点 id（readState 存、adoptChildren 在恢复收尾时收养） */
  private pendingChildIds: string[] = []

  /** 已由「端口收值」收养过的文件指纹，避免同一次/同一文件被重复入箱 */
  private readonly adoptedFingerprints = new Set<string>()

  constructor(id: string) {
    super(id)
    this.addInput(this.fileInput)
    // 默认 2×2 最小框；setBox override 会钳制到 MIN_W/MIN_H
    this.setBox(MIN_W, MIN_H)
  }

  // —— 收养（统一入口） ——

  /**
   * 把已有节点收养进文件夹：标记归属、放进 children、snap 到槽位。
   * 子节点已在 Scene 里（或调用方保证随后 addNode），文件字节归属不变。
   */
  adoptNode(child: Node): void {
    if (child === this) return
    if (child.containerNode) return // 已被收养（含被本文件夹收养过）
    if (this.isDescendant(child)) return // 把祖先收养进自己 = 成环，拒绝
    if (child instanceof FileNode && child.containerNode) return // 安全冗余

    child.containerNode = this
    this.children.push(child)
    const slot = this.computeSlotPosition(this.children.length - 1)
    child.setPosition(slot[0], slot[1])
    // 结构变更：child 从顶层集合退出，App 要重算
    this.sceneRef?.notifyChanged()
    this.notifyChanged()
  }

  /**
   * 释放子节点回画布：清归属、移出 children。
   * 子节点目前存的是相对本文件夹的局部坐标，直接清归属会把它定死在错误的局部位置——
   * 先补上本文件夹的世界坐标，让它原地留在同一世界位置（边按端口引用保留）。
   */
  removeChild(child: Node): void {
    const idx = this.children.indexOf(child)
    if (idx < 0) return
    this.children.splice(idx, 1)
    const [wx, wy] = this.worldPosition
    const [lx, ly] = child.position
    child.setPosition(wx + lx, wy + ly)
    child.containerNode = undefined
    // 结构变更：child 加入顶层集合，App 要重算（之前它只在文件夹里嵌套渲染）
    this.sceneRef?.notifyChanged()
    this.notifyChanged()
  }

  /** 恢复收尾：按 pendingChildIds 收养（缺 id 跳过），清空暂存 */
  adoptChildren(scene: Scene): void {
    for (const id of this.pendingChildIds) {
      const child = scene.getNode(id)
      if (child && child !== this) this.adoptNode(child)
    }
    this.pendingChildIds = []
  }

  /** child 是否在我的祖先链里（即收养它会成环） */
  private isDescendant(child: Node): boolean {
    let cur: Node | undefined = this.containerNode
    while (cur) {
      if (cur === child) return true
      cur = cur.containerNode
    }
    return false
  }

  // —— 三个收养入口 ——

  /** 端口收值：收到文件 Value → 按文件后缀决定子节点类型 → 构造 → 收养（文件字节已在画布目录，不复制） */
  inputPortReceiveValue(_ports: InputPort[]): void {
    const [first] = this.fileInput.value
    if (!(first instanceof FileValue)) return
    if (this.adoptedFingerprints.has(first.fingerprint)) return // 同一文件去重

    // 承接哪种子节点由文件夹决定：复用 App 落盘时的扩展名注册表（后缀 → 节点类），
    // 文件节点自身不承担任何「承接」职责。
    const manifest = resolveByExtension(extOf(first.file.name))
    if (!manifest) return

    const child = new manifest.nodeClass(this.makeId(manifest.type))
    ;(child as FileNode).setFile(first.file.name, first.file.size)
    const [sx, sy] = this.computeSlotPosition(this.children.length)
    child.setPosition(sx, sy)
    workspaceScene.addNode(child)
    this.adoptNode(child)
    this.adoptedFingerprints.add(first.fingerprint)
  }

  /** 文件拖入命中本节点内容区：恒接受（App 会复制文件后构造子节点再调 adoptNode） */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return true
  }

  /**
   * 文件 drop 提交：承接文件 → 复制到画布目录 → 按后缀决定子节点类型 → 构造 → 收养。
   * 承接是哪一种文件/构造哪种子节点，全由文件夹自己决定（App 只广播 onFileDrop，不特判）。
   */
  async onFileDrop(sourcePath: string): Promise<void> {
    // 文件副本：走 preload IPC（和 FileNode 一样配套 @ts-ignore，运行时在 renderer 才执行）
    let copied: { fileName: string; size: number }
    try {
      // @ts-ignore — tsconfig.node.json 编译本文件时不带 preload 的 Window 扩展，
      // 运行时本文件只在 renderer 里执行，window.fileApi 一定存在
      copied = await window.fileApi.copyPath(sourcePath)
    } catch (err) {
      console.warn(`[FolderNode] 收文件 ${sourcePath} 复制失败：`, err)
      return
    }
    // 承接哪种子节点由文件夹决定：复用扩展名注册表（后缀 → 节点类）
    const manifest = resolveByExtension(extOf(copied.fileName))
    if (!manifest) return
    const child = new manifest.nodeClass(this.makeId(manifest.type))
    ;(child as FileNode).setFile(copied.fileName, copied.size)
    workspaceScene.addNode(child)
    this.adoptNode(child) // snap 到槽位（setPosition 覆盖初始位置）
  }

  /** 节点拖入：只接受「未被收养的文件节点」，且不能是自己的祖先 */
  isPositionAcceptNodeDrop(source: Node): boolean {
    if (!(source instanceof FileNode)) return false
    if (source.containerNode) return false
    if (this.isDescendant(source)) return false
    return true
  }

  /** 节点 drop 结算：直接收养源节点（边按端口引用自动保留）。不还原位置——收养即归位 */
  onNodeDrop(source: Node, _startPos: readonly [number, number]): boolean {
    if (!this.isPositionAcceptNodeDrop(source)) return false
    this.adoptNode(source)
    return true
  }

  // —— 尺寸 / 位置 ——

  /** 钳制到最小框（2×2 槽位）。resize 拖手柄走这里 */
  override setBox(width: number, height: number): void {
    super.setBox(Math.max(MIN_W, Math.round(width)), Math.max(MIN_H, Math.round(height)))
  }

  // 说明：没有 override setPosition。子节点的 position 是相对本文件夹的局部坐标，
  // 移动文件夹时子节点 DOM 跟着父容器一起走、无需平移，世界坐标由 worldPosition 实时累加。

  /**
   * 槽位**局部坐标**（相对本文件夹内容区左上角）。cols 由当前框内可容纳的列数推算。
   * 不含 folder.position —— 子节点的局部位置与文件夹落在哪无关，靠 DOM 嵌套复合世界坐标。
   */
  private computeSlotPosition(index: number): [number, number] {
    const innerW = Math.max(0, this.box[0] - PADDING * 2 + GAP)
    const cols = Math.max(1, Math.floor(innerW / (SLOT_W + GAP)))
    const col = index % cols
    const row = Math.floor(index / cols)
    return [
      PADDING + col * (SLOT_W + GAP),
      BAR_H + PADDING + row * (SLOT_H + GAP)
    ]
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      childIds: this.children.map((c) => c.id),
      box: this.box as readonly [number, number]
    }
  }

  readState(state: Record<string, unknown>): void {
    const box = state.box as [number, number] | undefined
    if (box !== undefined) {
      this.setBox(box[0], box[1])
    }
    const ids = state.childIds
    if (Array.isArray(ids)) {
      this.pendingChildIds = ids.filter((x): x is string => typeof x === 'string')
    }
  }

  /** 删除文件夹前：把全部子节点先释放回画布根部（清归属、补世界坐标，边保留），再走基类清理 */
  override async beforeDestroy(): Promise<void> {
    const [wx, wy] = this.worldPosition
    for (const c of this.children) {
      const [lx, ly] = c.position
      c.setPosition(wx + lx, wy + ly)
      c.containerNode = undefined
    }
    this.children.length = 0
    await super.beforeDestroy()
  }

  // —— 工具 ——

  /** 生成与画布一致的节点 ID（类型 + 时间戳 + 随机后缀） */
  private makeId(type: string): string {
    return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  }
}