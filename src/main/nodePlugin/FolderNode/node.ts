import { Node } from '../../engine/node/Node'
import { InputPort } from '../../engine/port/InputPort'
import type { Scene } from '../../engine/graph/Scene'
import { FileValue } from '../../engine/data/FileValue'
import { TxtFileValue } from '../../engine/data/TxtFileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { FileNode } from '../FileNode/node'
import { resolveByExtension } from '../index'
import { workspaceScene } from '../../engine/graph/SceneRegistry'

/** 内容区内边距（子节点距离文件夹边框的默认偏移） */
export const PADDING = 12
/** 顶部横栏（可拖动文件夹的标题栏）高度，内容区从这里下方起算 */
export const BAR_H = 22
/** 文件夹最小宽高，resize 时钳制 */
export const MIN_W = 100
export const MIN_H = 80

/** 取文件名后缀（含点、小写）；无扩展名返回空串 */
function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

/** File → base64 字符串（去掉 data:xxx;base64, 前缀），供 writeBuffer 用 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
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

  /** 已收养的子节点列表。子节点仍是 Scene 里的顶层节点，只是归属这里 */
  readonly children: Node[] = []

  /** 持久化期间暂存的待收养子节点 id（readState 存、adoptChildren 在恢复收尾时收养） */
  private pendingChildIds: string[] = []

  /** fingerprint → 子节点。端口收值时建映射，removeChild 时按子节点反查 fingerprint 删掉 */
  private readonly fingerprintToChild = new Map<string, Node>()

  constructor(id: string) {
    super(id)
    this.addInput(this.fileInput)
    // 默认最小框；setBox override 会钳制到 MIN_W/MIN_H
    this.setBox(MIN_W, MIN_H)
  }

  // —— 收养（统一入口） ——

  /**
   * 把已有节点收养进文件夹：标记归属、放进 children。
   * position 由调用方保证已经是相对本文件夹的正确局部坐标——本方法不做任何转换。
   *
   * 三种调用场景，position 来源各不同：
   * - 恢复场景（adoptChildren）：DB 读出来的局部坐标，已是正确值
   * - 新建场景（inputPortReceiveValue / onFileDrop）：调用方直接设成局部坐标
   * - 拖入场景（onNodeDrop）：调用方把世界坐标转成局部坐标再传进来
   */
  adoptNode(child: Node): void {
    if (child === this) return
    if (child.containerNode) return // 已被收养（含被本文件夹收养过）
    if (this.isDescendant(child)) return // 把祖先收养进自己 = 成环，拒绝
    if (child instanceof FileNode && child.containerNode) return // 安全冗余

    child.containerNode = this
    this.children.push(child)
    // 结构变更：child 从顶层集合退出，App 要重算
    this.sceneRef?.notifyChanged()
    this.notifyChanged()
  }

  /**
   * 释放子节点回画布：清归属、移出 children。
   * 子节点目前存的是相对本文件夹的局部坐标，直接清归属会把它定死在错误的局部位置——
   * 先补上本文件夹的世界坐标，让它原地留在同一世界位置（边按端口引用保留）。
   * 同时清理去重集：子节点的 fingerprint 从 adoptedFingerprints 里删掉，
   * 否则这个文件以后重新通过端口进来会被误判成已收过。
   */
  removeChild(child: Node): void {
    const idx = this.children.indexOf(child)
    if (idx < 0) return
    this.children.splice(idx, 1)
    // 清理映射：遍历找 value === child 的条目删掉，Map 不大不用反查
    for (const [fp, c] of this.fingerprintToChild) {
      if (c === child) {
        this.fingerprintToChild.delete(fp)
        break
      }
    }
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

  /** 端口收值：收到文件 Value → 落盘 → 按文件后缀决定子节点类型 → 构造 → 收养 */
  async inputPortReceiveValue(_ports: InputPort[]): Promise<void> {
    const [first] = this.fileInput.value
    if (!(first instanceof FileValue)) return
    if (this.fingerprintToChild.has(first.fingerprint)) return // 同一文件去重

    // FileValue.file 是浏览器原生 File（内存中，无磁盘路径），必须转 base64 落盘
    let written: { fileName: string; size: number }
    try {
      const base64 = await fileToBase64(first.file)
      // @ts-ignore — tsconfig.node.json 编译本文件时不带 preload 的 Window 扩展，
      // 运行时本文件只在 renderer 里执行，window.fileApi 一定存在
      written = await window.fileApi.writeBuffer(first.file.name, base64)
    } catch (err) {
      console.warn(`[FolderNode] 收文件 ${first.file.name} 落盘失败：`, err)
      return
    }

    // 承接哪种子节点由文件夹决定：复用 App 落盘时的扩展名注册表（后缀 → 节点类），
    // 文件节点自身不承担任何「承接」职责。
    const manifest = resolveByExtension(extOf(first.file.name))
    if (!manifest) return

    const child = new manifest.nodeClass(this.makeId(manifest.type))
    ;(child as FileNode).setFile(written.fileName, written.size)
    // 直接设局部坐标（内容区左上角）——adoptNode 不再做转换
    child.setPosition(PADDING, BAR_H + PADDING)
    workspaceScene.addNode(child)
    this.adoptNode(child)
    this.fingerprintToChild.set(first.fingerprint, child)
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
    // 直接设局部坐标（内容区左上角）——adoptNode 不再做转换
    child.setPosition(PADDING, BAR_H + PADDING)
    workspaceScene.addNode(child)
    this.adoptNode(child)
  }

  /** 节点拖入：只接受「未被收养的文件节点」，且不能是自己的祖先 */
  isPositionAcceptNodeDrop(source: Node): boolean {
    if (!(source instanceof FileNode)) return false
    if (source.containerNode) return false
    if (this.isDescendant(source)) return false
    return true
  }

  /** 节点 drop 结算：把被拖的顶级节点世界坐标转成本文件夹局部坐标，再收养（保持落点） */
  onNodeDrop(source: Node, _startPos: readonly [number, number]): boolean {
    if (!this.isPositionAcceptNodeDrop(source)) return false
    // source 是顶级节点，position 是世界坐标；转成相对本文件夹的局部坐标
    const [swx, swy] = source.worldPosition
    const [fwx, fwy] = this.worldPosition
    source.setPosition(swx - fwx, swy - fwy)
    this.adoptNode(source)
    return true
  }

  // —— 尺寸 / 位置 ——

  /** 钳制到最小框。resize 拖手柄走这里 */
  override setBox(width: number, height: number): void {
    super.setBox(Math.max(MIN_W, Math.round(width)), Math.max(MIN_H, Math.round(height)))
  }

  // 说明：没有 override setPosition。子节点的 position 是相对本文件夹的局部坐标，
  // 移动文件夹时子节点 DOM 跟着父容器一起走、无需平移，世界坐标由 worldPosition 实时累加。

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    // Map 不可直接 JSON，存成 [fingerprint, nodeId] 数组
    const fpPairs = Array.from(this.fingerprintToChild.entries()).map(([fp, n]) => [fp, n.id])
    return {
      childIds: this.children.map((c) => c.id),
      box: this.box as readonly [number, number],
      fingerprintPairs: fpPairs
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
    // 恢复 fingerprint → Node 映射（此时 scene 已注入，节点都在 Scene 里可反查）
    const pairs = state.fingerprintPairs
    if (Array.isArray(pairs)) {
      const scene = this.sceneRef
      for (const pair of pairs) {
        if (Array.isArray(pair) && pair.length === 2) {
          const fp = pair[0]
          const nodeId = pair[1]
          if (typeof fp === 'string' && typeof nodeId === 'string' && scene) {
            const node = scene.getNode(nodeId)
            if (node) this.fingerprintToChild.set(fp, node)
          }
        }
      }
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