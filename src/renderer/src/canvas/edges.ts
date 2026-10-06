import type { Scene } from '../../../main/engine/graph/Scene'
import type { Edge } from '../../../main/engine/graph/Edge'
import type { Node } from '../../../main/engine/node/Node'
import type { InputPort } from '../../../main/engine/port/InputPort'
import { MethodPort } from '../../../main/engine/port/MethodPort'
import { OutputPort } from '../../../main/engine/port/OutputPort'
import { measureNodeBox, measurePortCenter, type PortSide, type Vec2 } from './elements'

/**
 * 连线的**纯几何**：把一条 Edge 算成「画布上从哪个端口连到哪个端口」。
 *
 * 端口自身不带 owner（OutputPort 连 owner 字段都没有），所以「这条边属于哪两个节点」
 * 由 Scene 反查：拿端口去各节点的端口集合里比对。节点数量级很小，线性扫足够。
 *
 * 端点取**端口圆点的中心**，不是卡片边线的中点：一条边本来就是「某个输出端口 -> 某个输入
 * 端口」，画到圆点上，才能一眼看出是哪个端口出去的、进了哪个端口。圆点位置由 elements.ts
 * 实测（相对卡片的偏移 + 节点世界坐标）。
 */

export interface EdgeGeometry {
  /** 这条几何属于哪条边——删除按钮要拿它去 Scene.removeEdge */
  readonly edge: Edge
  /** 起点：上游输出端口圆点的中心 */
  readonly from: Vec2
  /** 终点：下游输入端口圆点的中心 */
  readonly to: Vec2
  /** 连线正中央（三次贝塞尔曲线 t=0.5），删除按钮落在这里 */
  readonly mid: Vec2
}

/** 主画布贝塞尔的水平控制距离下限：节点挨太近时曲线也能看出弧度 */
const BEZIER_HANDLE_MIN = 40

/**
 * 算三次贝塞尔曲线的两个控制点（输出端向右，输入端向左，水平延伸）。
 * @param minHandle 控制点的最小水平距离（默认 40）。小地图等缩小场景传 0 或小值，避免控制点比连线还长。
 */
export function bezierControls(
  from: Vec2,
  to: Vec2,
  minHandle: number = BEZIER_HANDLE_MIN
): { c1: Vec2; c2: Vec2 } {
  const dx = Math.abs(to.x - from.x)
  const offset = Math.max(dx * 0.5, minHandle)
  return {
    c1: { x: from.x + offset, y: from.y },
    c2: { x: to.x - offset, y: to.y }
  }
}

/** 生成三次贝塞尔曲线的 SVG d 属性 */
export function bezierPath(from: Vec2, to: Vec2, minHandle?: number): string {
  const { c1, c2 } = bezierControls(from, to, minHandle)
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`
}

/** 三次贝塞尔曲线的中点（参数 t=0.5） */
export function bezierMid(from: Vec2, to: Vec2, minHandle?: number): Vec2 {
  const { c1, c2 } = bezierControls(from, to, minHandle)
  // t=0.5 时：P = 0.125*from + 0.375*c1 + 0.375*c2 + 0.125*to
  return {
    x: 0.125 * from.x + 0.375 * c1.x + 0.375 * c2.x + 0.125 * to.x,
    y: 0.125 * from.y + 0.375 * c1.y + 0.375 * c2.y + 0.125 * to.y
  }
}

function ownsPort(node: Node, port: OutputPort | InputPort): boolean {
  // MethodPort 不在 inputPorts 数组里，需要额外检查
  const allInputLike = [...node.inputPorts, ...(node.methodPorts ?? [])]
  return [...node.outputPorts, ...allInputLike].some((candidate) => candidate === port)
}

/** 端口 -> 所属节点。节点已被移出场景时返回 undefined，调用方自然跳过这条边 */
function ownerOfPort(scene: Scene, port: OutputPort | InputPort): Node | undefined {
  return scene.allNodes.find((node) => ownsPort(node, port))
}

/**
 * 判断端口属于哪一侧：
 * - OutputPort → 'out'（右侧）
 * - MethodPort → 'method'（底部）
 * - 其他 InputPort → 'in'（左侧）
 */
function sideOfPort(port: OutputPort | InputPort): PortSide {
  // 必须先判 MethodPort——它继承 InputPort，instanceof 对 TypeScript 类型收窄有效
  if (port instanceof MethodPort) return 'method'
  if (port instanceof OutputPort) return 'out'
  return 'in'
}

/**
 * 端口锚点：圆点中心；圆点还没登记（节点刚挂载、或该节点类型没渲染 NodePorts）时，
 * 退回卡片对应侧边的中点——宁可端点粗略，也别让线凭空消失。
 */
function portAnchor(node: Node, port: OutputPort | InputPort, side: PortSide): Vec2 {
  const measured = measurePortCenter(node.id, node.worldPosition, side, port)
  if (measured) return measured

  const box = measureNodeBox(node.id, node.worldPosition, node.box)
  if (side === 'out') {
    return { x: box.x + box.width, y: box.y + box.height / 2 }
  } else if (side === 'method') {
    // 底部方法端口兜底：卡片底部中点
    return { x: box.x + box.width / 2, y: box.y + box.height }
  } else {
    return { x: box.x, y: box.y + box.height / 2 }
  }
}

/** 算一条边的画布几何；任一端查不到节点（比如节点已被移除）时返回 undefined */
export function edgeGeometry(scene: Scene, edge: Edge): EdgeGeometry | undefined {
  const startNode = ownerOfPort(scene, edge.startPort)
  const endNode = ownerOfPort(scene, edge.endPort)
  if (!startNode || !endNode) return undefined

  const from = portAnchor(startNode, edge.startPort, 'out')
  // endPort 可能是 InputPort（'in'）或 MethodPort（'method'）——动态判断
  const endSide = sideOfPort(edge.endPort)
  const to = portAnchor(endNode, edge.endPort, endSide)

  return {
    edge,
    from,
    to,
    mid: bezierMid(from, to)
  }
}

/** 过滤掉算不出几何的边，让 filter 保持类型收窄 */
export function isEdgeGeometry(geometry: EdgeGeometry | undefined): geometry is EdgeGeometry {
  return geometry !== undefined
}
