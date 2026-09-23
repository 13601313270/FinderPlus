import { reactive } from 'vue'
import { workspaceScene } from '../../../main/engine/graph/SceneRegistry'
import type { OutputPort } from '../../../main/engine/port/OutputPort'
import type { InputPort } from '../../../main/engine/port/InputPort'
import { findPortNear, portKey } from './elements'
import { clearCanvasNotice, showCanvasNotice } from './notice'

/**
 * 端口连线拖拽：按住某个节点的 OutputPort 圆点，拖到另一个节点的 InputPort 圆点上松手，就建立连接。
 *
 * 这是**渲染进程的 UI 状态**（跟 viewport 一个路子：模块级 reactive 单例，多个组件共享）：
 * - 拖拽源在 NodePorts（圆点的 pointerdown）；
 * - 预览线在 ConnectionPreview（画在屏幕层，压在节点之上）；
 * - 落点判定和真正的 connect 在这里收口。
 *
 * 坐标一律用**屏幕坐标**（client）：预览线画在屏幕层，不必折算世界坐标；命中半径也按屏幕像素算，
 * 缩放不会影响落点手感。
 *
 * 真正写图的只有一处：`workspaceScene.connect`（它再委托 EdgeBinder，保证两端指针一致）。
 * 这里只负责「能不能连」的判定和失败原因的翻译。
 */

/** 正在拖的连线。别直接改字段，走下面的 startConnectDrag */
export const connectionDrag = reactive({
  active: false,
  /** 拖拽起点（源端口圆点的屏幕坐标） */
  fromClient: { x: 0, y: 0 },
  /** 预览线终点：命中端口时吸附到圆心，否则跟着指针 */
  toClient: { x: 0, y: 0 },
  /** 源端口在注册表里的键，用来给圆点加高亮 */
  sourceKey: null as string | null,
  /** 指针下面的候选输入端口（注册键），null 表示悬空 */
  targetKey: null as string | null,
  /** 候选端口接不接得上（引擎的判定结果），接不上时预览线画成红的 */
  targetOk: false
})

/** 连接失败的一次性提示。引擎只给判定（reason），文案在这里翻译成人话 */
export const connectNotice = reactive({ text: '' })

const REASON_TEXT: Record<string, string> = {
  'already-bound': '这两个端口已经连上了',
  'kind-not-allowed': '类型不匹配：这个输入端口不接受该类型',
  'single-port-occupied': '这个输入端口只接一条线，先断开原来那条'
}

/** 端口命中半径（屏幕像素）：圆点才 12px，给点容错 */
const PORT_HIT_RADIUS = 24

// 拖拽期间要用的「源」，不属于展示状态，留在模块里即可
let sourceNodeId: string | null = null
let sourcePort: OutputPort | null = null

/**
 * 开始拖拽连线。只认 OutputPort（右侧圆点）——连线的方向就是「输出 -> 输入」。
 * @param nodeId 源端口所属节点
 * @param portId 源端口 id
 * @param event 圆点上的 pointerdown
 */
export function startConnectDrag(nodeId: string, portId: string, event: PointerEvent): void {
  const dot = event.currentTarget
  if (!(dot instanceof HTMLElement)) return

  // 这一下是「拉线」，不是「拖节点 / 平移画布」，别让它们也响应
  event.preventDefault()
  event.stopPropagation()

  const port = resolveOutputPort(nodeId, portId)
  if (!port) return

  const rect = dot.getBoundingClientRect()
  sourceNodeId = nodeId
  sourcePort = port
  clearCanvasNotice()

  connectionDrag.active = true
  connectionDrag.sourceKey = portKey(nodeId, 'out', portId)
  connectionDrag.fromClient = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  moveTo(event.clientX, event.clientY)

  // 指针捕获：拖到窗口外再松手也能收到 pointerup，不会卡在「拖拽中」。
  // 合成事件（脚本 / 测试里手动 dispatch 的 PointerEvent）没有活跃指针，捕获会抛，
  // 但 window 上的监听照样收得到事件，所以这里失败也不影响拖拽。
  try {
    dot.setPointerCapture(event.pointerId)
  } catch {
    // 忽略：没有活跃指针可捕获
  }

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', endDrag)
}

function onPointerMove(event: PointerEvent): void {
  moveTo(event.clientX, event.clientY)
}

/** 落点在**松手的位置**判定：拖到一半又挪开，就以最终落点为准 */
function onPointerUp(event: PointerEvent): void {
  const from = sourcePort
  const fromNode = sourceNodeId
  const hit = findPortNear(event.clientX, event.clientY, 'in', PORT_HIT_RADIUS)
  endDrag()

  if (!from || !fromNode || !hit) return // 松在空白处：什么都不做，等于取消

  if (hit.nodeId === fromNode) {
    showCanvasNotice('同一个节点的端口之间不能连线', 'error')
    return
  }

  const target = resolveInputPort(hit.nodeId, hit.portId)
  if (!target) return

  // 唯一的写入入口；能不能连由引擎判（跟预览时用的是同一套规则）
  const result = workspaceScene.connect(from, target)
  if (!result.ok) showCanvasNotice(REASON_TEXT[result.reason] ?? `连接失败：${result.reason}`, 'error')
}

/** 指针下面的候选端口 + 预览线终点（吸附到圆心）。拖拽过程中反复调用 */
function moveTo(clientX: number, clientY: number): void {
  const hit = findPortNear(clientX, clientY, 'in', PORT_HIT_RADIUS)

  if (hit) {
    connectionDrag.targetKey = hit.key
    connectionDrag.targetOk = isConnectable(hit)
    connectionDrag.toClient = { x: hit.clientX, y: hit.clientY }
    return
  }

  connectionDrag.targetKey = null
  connectionDrag.targetOk = false
  connectionDrag.toClient = { x: clientX, y: clientY }
}

/**
 * 这个候选端口接不接得上：问引擎（InputPort.canBindKind），不在这里抄规则。
 * 另外加一条 UI 层的规矩：同一个节点的端口之间不许连——那是自环，等于自己喂自己。
 *
 * ⚠️ 成环检测（跨节点的环路）仍未实现，将来要在这一层补：connect 之前先判「从目标节点出发
 * 能不能绕回源节点」。
 */
function isConnectable(hit: { nodeId: string; portId: string }): boolean {
  if (!sourcePort || hit.nodeId === sourceNodeId) return false

  const target = resolveInputPort(hit.nodeId, hit.portId)
  if (!target) return false

  return target.canBindEdge(sourcePort).result
}

export function endDrag(): void {
  connectionDrag.active = false
  connectionDrag.sourceKey = null
  connectionDrag.targetKey = null
  connectionDrag.targetOk = false
  sourceNodeId = null
  sourcePort = null

  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', endDrag)
}

// —— 注册键 -> 场景里真实的端口 ——
// 一律从 Scene 现取，不缓存端口对象：既绕开「Vue 代理 vs 原始对象」的身份问题，
// 也保证拿到的就是引擎里那个端口。

function resolveOutputPort(nodeId: string, portId: string): OutputPort | undefined {
  const node = workspaceScene.getNode(nodeId)
  return node?.outputPorts.find((port) => port.id === portId)
}

function resolveInputPort(nodeId: string, portId: string): InputPort | undefined {
  const node = workspaceScene.getNode(nodeId)
  return node?.inputPorts.find((port) => port.id === portId)
}
