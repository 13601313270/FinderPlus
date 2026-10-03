import { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'

/**
 * 表节点：在 SQLite 里动态建一张物理表，画布上展示成可分页编辑的数据表。
 *
 * 生命周期：
 * - 新建 / 恢复 → render.vue onMounted 调 table:ensure（IF NOT EXISTS 幂等）
 * - 删除节点 → beforeDestroy() 调 table:drop
 *
 * 列定义存在 saveState() 里（nodes.params 列），动态表名从 node.id 派生。
 */
export type ColumnType = 'number' | 'string' | 'boolean'

export interface ColumnDef {
  name: string
  type: ColumnType
}

export class TableNode extends Node {
  static readonly TYPE = 'table'
  readonly type = TableNode.TYPE

  /** 自定义列定义（不含内置自增 id 列） */
  columns: ColumnDef[] = []

  constructor(id: string) {
    super(id)
    // 默认给一个示例 string 列，用户可以在 UI 里改
    this.columns = [{ name: 'name', type: 'string' }]
    // 内容区宽 480px，高 320px（不含端口列）
    this.setBox(480, 320)
  }

  // —— Node 基类抽象方法 ——

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  inputPortReceiveValue(_ports: InputPort[]): void {
    // 第一期没有输入端口，不处理
  }

  saveState(): Record<string, unknown> {
    return { columns: this.columns }
  }

  readState(state: Record<string, unknown>): void {
    if (Array.isArray(state.columns)) {
      this.columns = state.columns.filter(
        (c: unknown) => typeof c === 'object' && c !== null && typeof (c as ColumnDef).name === 'string'
      ) as ColumnDef[]
    }
  }

  /**
   * 删除节点前清理物理表。
   * Scene.removeNode 会先 await 这个，再断边、删记录、落库。
   * 调用发生在 renderer 侧，可以安全调 preload API。
   *
   * @ts-ignore — 同 FileNode/CodeNode：tsconfig.node.json 编译本文件时不带 preload 的 Window 扩展，
   * 但运行时本文件只在 renderer 里执行，window.tableApi 一定存在
   */
  async beforeDestroy(): Promise<void> {
    try {
      // @ts-ignore
      await window.tableApi.drop({ nodeId: this.id })
    } catch (err) {
      // 删表失败不阻塞节点删除——可能是表已经不存在了
      console.warn('[TableNode] drop table failed:', err)
    }
  }

  // —— 列定义管理（UI 调用） ——

  /** 添加一列 */
  addColumn(name: string, type: ColumnType): void {
    this.columns.push({ name, type })
    this.notifyChanged()
  }

  /** 删除一列（不影响已存在的物理表列——那需要 ALTER TABLE，第一期先不做） */
  removeColumn(index: number): void {
    if (index >= 0 && index < this.columns.length) {
      this.columns.splice(index, 1)
      this.notifyChanged()
    }
  }
}
