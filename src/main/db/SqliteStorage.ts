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
      `INSERT INTO nodes (id, canvas_id, type, pos_x, pos_y, params, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         pos_x = excluded.pos_x,
         pos_y = excluded.pos_y,
         params = excluded.params,
         updated_at = excluded.updated_at`,
      [
        node.id,
        this.canvasId,
        node.type,
        node.position[0],
        node.position[1],
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
  loadNodes(canvasId?: string): Array<{ id: string; type: string; posX: number; posY: number; paramsJson: string }> {
    const id = canvasId ?? this.canvasId
    const rows = this.db.exec('SELECT id, type, pos_x, pos_y, params FROM nodes WHERE canvas_id = ?', [id])
    if (!rows.length) return []
    return rows[0].values.map((row) => ({
      id: String(row[0]),
      type: String(row[1]),
      posX: Number(row[2]),
      posY: Number(row[3]),
      paramsJson: String(row[4])
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
}
