import type { Scene } from '../../../main/engine/graph/Scene'
import type { Edge } from '../../../main/engine/graph/Edge'
import type { Node } from '../../../main/engine/node/Node'
import type { InputPort } from '../../../main/engine/port/InputPort'
import type { OutputPort } from '../../../main/engine/port/OutputPort'
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
  /** 连线正中央，删除按钮落在这里 */
  readonly mid: Vec2
}

function ownsPort(node: Node, port: OutputPort | InputPort): boolean {
  return [...node.outputPorts, ...node.inputPorts].some((candidate) => candidate === port)
}

/** 端口 -> 所属节点。节点已被移出场景时返回 undefined，调用方自然跳过这条边 */
function ownerOfPort(scene: Scene, port: OutputPort | InputPort): Node | undefined {
  return scene.allNodes.find((node) => ownsPort(node, port))
}

/**
 * 端口锚点：圆点中心；圆点还没登记（节点刚挂载、或该节点类型没渲染 NodePorts）时，
 * 退回卡片对应侧边的中点——宁可端点粗略，也别让线凭空消失。
 */
function portAnchor(node: Node, port: OutputPort | InputPort, side: PortSide): Vec2 {
  const measured = measurePortCenter(node.id, node.worldPosition, side, port)
  if (measured) return measured

  const box = measureNodeBox(node.id, node.worldPosition, node.box)
  return side === 'out'
    ? { x: box.x + box.width, y: box.y + box.height / 2 }
    : { x: box.x, y: box.y + box.height / 2 }
}

/** 算一条边的画布几何；任一端查不到节点（比如节点已被移除）时返回 undefined */
export function edgeGeometry(scene: Scene, edge: Edge): EdgeGeometry | undefined {
  const startNode = ownerOfPort(scene, edge.startPort)
  const endNode = ownerOfPort(scene, edge.endPort)
  if (!startNode || !endNode) return undefined

  const from = portAnchor(startNode, edge.startPort, 'out')
  const to = portAnchor(endNode, edge.endPort, 'in')

  return {
    edge,
    from,
    to,
    mid: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  }
}

/** 过滤掉算不出几何的边，让 filter 保持类型收窄 */
export function isEdgeGeometry(geometry: EdgeGeometry | undefined): geometry is EdgeGeometry {
  return geometry !== undefined
}
