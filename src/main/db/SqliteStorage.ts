import type { Database } from 'sql.js'
import type { Node } from '../engine/node/Node'
import type { Edge } from '../engine/graph/Edge'
import type { NodeStorage } from '../engine/storage/NodeStorage'
import { persist } from './database'

/**
 * 基于 sql.js（WASM）的 NodeStorage 实现。
 *
 * sql.js 本身是内存数据库，改完必须手动 persist() 把内存状态写回 .db 文件。
 * 每次 saveNode / deleteNode / saveEdge / deleteEdge / saveViewport 之后都调一次。
 * 如果将来要做批量事务（比如一个节点刚加进来又马上被改），可以在外层包事务减少 IO 次数。
 */
const NOW = () => Date.now()

export class SqliteStorage implements NodeStorage {
  constructor(
    private readonly db: Database,
    private readonly canvasId: string = 'default'
  ) {}

  saveNode(node: Node): void {
    this.db.run(
      `INSERT INTO nodes (id, canvas_id, type, pos_x, pos_y, minimized, params, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         pos_x = excluded.pos_x,
         pos_y = excluded.pos_y,
         minimized = excluded.minimized,
         params = excluded.params,
         updated_at = excluded.updated_at`,
      [
        node.id,
        this.canvasId,
        node.type,
        node.position[0],
        node.position[1],
        node.minimized ? 1 : 0,
        JSON.stringify(node.saveState()),
        NOW(),
        NOW()
      ]
    )
    persist()
  }

  deleteNode(nodeId: string): void {
    // edges 表里有 ON DELETE CASCADE，关联边会自动清掉
    this.db.run('DELETE FROM nodes WHERE id = ?', [nodeId])
    persist()
  }

  saveEdge(params: {
    edge: Edge
    startNodeId: string
    startPortId: string
    endNodeId: string
    endPortId: string
  }): void {
    const { edge, startNodeId, startPortId, endNodeId, endPortId } = params
    this.db.run(
      `INSERT INTO edges (id, canvas_id, start_node_id, start_port_id, end_node_id, end_port_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         start_node_id = excluded.start_node_id,
         start_port_id = excluded.start_port_id,
         end_node_id = excluded.end_node_id,
         end_port_id = excluded.end_port_id`,
      [edge.id, this.canvasId, startNodeId, startPortId, endNodeId, endPortId]
    )
    persist()
  }

  deleteEdge(edge: Edge): void {
    this.db.run('DELETE FROM edges WHERE id = ?', [edge.id])
    persist()
  }

  saveViewport(x: number, y: number, scale: number): void {
    const now = NOW()
    this.db.run(
      `INSERT INTO canvases (id, name, viewport_x, viewport_y, viewport_scale, updated_at)
       VALUES (?, '未命名', ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         viewport_x = excluded.viewport_x,
         viewport_y = excluded.viewport_y,
         viewport_scale = excluded.viewport_scale,
         updated_at = excluded.updated_at`,
      [this.canvasId, x, y, scale, now]
    )
    persist()
  }

  clearAll(): void {
    // edges 有 ON DELETE CASCADE（nodes → edges），所以只删 nodes 就够。
    // 但显式先删 edges 再删 nodes，更稳妥（避免未来 schema 改了外键方向搞炸）。
    this.db.run('DELETE FROM edges WHERE canvas_id = ?', [this.canvasId])
    this.db.run('DELETE FROM nodes WHERE canvas_id = ?', [this.canvasId])
    persist()
  }

  // —— 启动时读取：不在 NodeStorage 接口里，主进程 IPC handler（db:loadCanvas）会调 ——

  /** 读 nodes 表，返回纯数据；canvasId 未传则用构造时绑定的 */
  loadNodes(canvasId?: string): Array<{ id: string; type: string; posX: number; posY: number; minimized: boolean; paramsJson: string }> {
    const id = canvasId ?? this.canvasId
    const rows = this.db.exec('SELECT id, type, pos_x, pos_y, minimized, params FROM nodes WHERE canvas_id = ?', [id])
    if (!rows.length) return []
    return rows[0].values.map((row) => ({
      id: String(row[0]),
      type: String(row[1]),
      posX: Number(row[2]),
      posY: Number(row[3]),
      minimized: Number(row[4]) === 1,
      paramsJson: String(row[5])
    }))
  }

  /** 读 edges 表，返回纯数据；canvasId 未传则用构造时绑定的 */
  loadEdges(canvasId?: string): Array<{
    id: string
    startNodeId: string
    startPortId: string
    endNodeId: string
    endPortId: string
  }> {
    const id = canvasId ?? this.canvasId
    const rows = this.db.exec(
      'SELECT id, start_node_id, start_port_id, end_node_id, end_port_id FROM edges WHERE canvas_id = ?',
      [id]
    )
    if (!rows.length) return []
    return rows[0].values.map((row) => ({
      id: String(row[0]),
      startNodeId: String(row[1]),
      startPortId: String(row[2]),
      endNodeId: String(row[3]),
      endPortId: String(row[4])
    }))
  }

  /** 读 canvases 表的视口；canvasId 未传则用构造时绑定的 */
  loadViewport(canvasId?: string): { x: number; y: number; scale: number } {
    const id = canvasId ?? this.canvasId
    const rows = this.db.exec(
      'SELECT viewport_x, viewport_y, viewport_scale FROM canvases WHERE id = ?',
      [id]
    )
    if (!rows.length || !rows[0].values.length) return { x: 0, y: 0, scale: 1 }
    const row = rows[0].values[0]
    return { x: Number(row[0]), y: Number(row[1]), scale: Number(row[2]) }
  }

  /** 单个装饰元素 upsert：调用方负责逐行写 */
  saveDecor(decor: {
    id: string
    canvasId?: string
    type: string
    x: number
    y: number
    width: number
    height: number
    fill: string
    stroke: string
    strokeWidth: number
    radius: number
    title: string
    titleColor: string
  }): void {
    const id = decor.canvasId ?? this.canvasId
    // eslint-disable-next-line no-console
    console.log('[sqlite] saveDecor', decor.id, 'canvasId=', id, { x: decor.x, y: decor.y })
    this.db.run(
      `INSERT INTO decors (id, canvas_id, type, x, y, width, height, fill, stroke, stroke_width, radius, title, title_color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         canvas_id   = excluded.canvas_id,
         type        = excluded.type,
         x           = excluded.x,
         y           = excluded.y,
         width       = excluded.width,
         height      = excluded.height,
         fill        = excluded.fill,
         stroke      = excluded.stroke,
         stroke_width = excluded.stroke_width,
         radius      = excluded.radius,
         title       = excluded.title,
         title_color = excluded.title_color`,
      [
        decor.id, id, decor.type,
        decor.x, decor.y, decor.width, decor.height,
        decor.fill, decor.stroke, decor.strokeWidth, decor.radius,
        decor.title, decor.titleColor
      ]
    )
    persist()
  }

  /** 单个装饰元素删除 */
  deleteDecor(id: string): void {
    this.db.run('DELETE FROM decors WHERE id = ?', [id])
    persist()
  }

  /** 清空指定画布的所有装饰 */
  clearDecors(canvasId?: string): void {
    const id = canvasId ?? this.canvasId
    this.db.run('DELETE FROM decors WHERE canvas_id = ?', [id])
    persist()
  }

  /** 读装饰元素，返回纯对象数组 */
  loadDecors(canvasId?: string): Array<{
    id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    fill: string
    stroke: string
    strokeWidth: number
    radius: number
    title: string
    titleColor: string
  }> {
    const id = canvasId ?? this.canvasId
    const rows = this.db.exec(
      `SELECT id, type, x, y, width, height, fill, stroke, stroke_width, radius, title, title_color
       FROM decors WHERE canvas_id = ?`,
      [id]
    )
    if (!rows.length) {
      // eslint-disable-next-line no-console
      console.log('[sqlite] loadDecors', id, '→ decors 表空')
      return []
    }
    const result = rows[0].values.map((row) => ({
      id: String(row[0]),
      type: String(row[1]),
      x: Number(row[2]),
      y: Number(row[3]),
      width: Number(row[4]),
      height: Number(row[5]),
      fill: String(row[6] ?? ''),
      stroke: String(row[7] ?? ''),
      strokeWidth: Number(row[8]),
      radius: Number(row[9]),
      title: String(row[10] ?? ''),
      titleColor: String(row[11] ?? '#6b7280')
    }))
    // eslint-disable-next-line no-console
    console.log('[sqlite] loadDecors', id, '→', result.length, 'rows', result)
    return result
  }
}
