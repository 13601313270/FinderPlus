import { Node } from '../../engine/node/Node'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { StringValue } from '../../engine/data/StringValue'
import { JsonValue } from '../../engine/data/JsonValue'

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

/**
 * 业务数据类型（语义层）——决定 UI 渲染什么组件。
 * 每个业务类型固定绑定一个存储类型（见 BUSINESS_TYPE_MAP）。
 */
export type BusinessType = 'text' | 'textarea' | 'number' | 'boolean' | 'color' | 'time' | 'date'

/** 业务类型 → 存储类型（SQLite DDL 用）的固定映射 */
export const BUSINESS_TYPE_MAP: Record<BusinessType, ColumnType> = {
  text: 'string',
  textarea: 'string',
  number: 'number',
  boolean: 'boolean',
  color: 'string',
  time: 'string',
  date: 'string'
}

/** 存储类型 → 默认业务类型（老存档没 businessType 时回退用） */
export const DEFAULT_BUSINESS_TYPE: Record<ColumnType, BusinessType> = {
  string: 'text',
  number: 'number',
  boolean: 'boolean'
}

export interface ColumnDef {
  /** SQL 列名（物理表用，不可变——改它要 ALTER TABLE RENAME） */
  name: string
  /** SQL 存储类型（物理表用）。从 BUSINESS_TYPE_MAP[businessType] 派生，也允许显式覆盖 */
  type: ColumnType
  /**
   * 业务数据类型（语义层）。决定 UI 渲染什么输入组件。
   * 省略时按 type 回退到默认值（string→'text', number→'number', boolean→'boolean'）。
   */
  businessType?: BusinessType
  /**
   * UI 显示标题（纯渲染元信息，不影响物理表）。
   * 未设置时退回 name。
   */
  title?: string
  /**
   * 是否在表格（列表视图）里显示这一列。默认 true。
   * false 时表格不渲染该列的 th/td，但表单（新增/编辑弹窗）仍然显示。
   * 适合宽表场景下把次要字段藏到表单里。
   */
  showInList?: boolean
  /**
   * 新增行时表单的默认回填值。纯 UI 元信息，不影响物理表 DDL。
   * 类型不限——string/number/boolean 都行，但要和列的 type 兼容：
   * - string 列：默认值应该是 string
   * - number 列：默认值应该可 Number() 转
   * - boolean 列：默认值应该是 boolean 或 truthy/falsy
   * 未设置时按 type 给硬编码兜底（'' / 0 / false）。
   */
  defaultValue?: unknown
  /**
   * 是否在表格搜索栏出现对应的搜索输入。默认 false。
   * true 时表格上方会出现该列业务类型对应的搜索组件（下拉筛选 / LIKE / 精确匹配）。
   * 搜索逻辑由主进程 table:queryPage 的 where 参数化查询承接。
   */
  showInSearch?: boolean
  /**
   * 新增后该行是否可以修改。默认 true。
   * false 时新增弹窗里可以填写，但修改弹窗里该列会禁用（disabled）。
   * 典型场景：创建时间、创建人、编号等"一旦落库就不该变"的字段。
   */
  canUpdate?: boolean
  /**
   * 是否可以用来排序。默认 false。
   * true 时表头可点击，三态循环：无排序 → 正序 → 逆序 → 无排序。
   * 排序由主进程 table:queryPage 的 ORDER BY 承接，列名走 sanitize 防注入。
   */
  canSort?: boolean
}

/** 获取列的业务类型——businessType 未设置时按 type 回退 */
export function resolveBusinessType(col: ColumnDef): BusinessType {
  return col.businessType ?? DEFAULT_BUSINESS_TYPE[col.type]
}

/** 获取列是否在列表视图显示——未设置时默认 true */
export function resolveShowInList(col: ColumnDef): boolean {
  return col.showInList !== false
}

/** 表格节点最小宽高，resize 时钳制 */
const MIN_W = 360
const MIN_H = 240

/** 动态查询端口对：一个输入（SQL 字符串）+ 一个输出（查询结果 JSON） */
export interface QueryPortPair {
  /** 唯一标识（如 `q_0`, `q_1`），持久化用 */
  readonly id: string
  /** 输入端口：接受上游 StringValue（SQL 语句） */
  readonly input: InputPort
  /** 输出端口：执行后 commit JsonValue（rows 数组） */
  readonly output: OutputPort
}

let nextQuerySeq = 0

function makeQueryId(): string {
  return `q_${++nextQuerySeq}`
}

/** 给输入端口单独的 label，明确提示用户 SQL 里用 `{table}` 占位符 */
function queryInputLabel(idx: number): { zh: string; en: string } {
  const n = idx + 1
  return {
    zh: `查询${n}·SQL (FROM {table})`,
    en: `Query ${n}·SQL (FROM {table})`
  }
}

/** 输出端口 label */
function queryOutputLabel(idx: number): { zh: string; en: string } {
  const n = idx + 1
  return {
    zh: `查询${n}·结果 JSON`,
    en: `Query ${n}·Result JSON`
  }
}

export class TableNode extends Node {
  static readonly TYPE = 'table'
  readonly type = TableNode.TYPE

  /** 自定义列定义（不含内置自增 id 列） */
  columns: ColumnDef[] = []

  /** 动态查询端口对列表，按 add 顺序排列 */
  readonly queryPorts: QueryPortPair[] = []

  constructor(id: string) {
    super(id)
    // 默认给一个示例 string 列，用户可以在 UI 里改
    this.columns = [{ name: 'name', type: 'string' }]
    // 内容区宽 480px，高 320px（不含端口列）
    this.setBox(480, 320)
  }

  override setBox(width: number, height: number): void {
    super.setBox(Math.max(MIN_W, Math.round(width)), Math.max(MIN_H, Math.round(height)))
  }

  // —— Node 基类抽象方法 ——

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  /**
   * 异步：收到输入端口值 → 找到对应端口对 → 执行 SQL → commit JsonValue 到输出端口。
   *
   * @ts-ignore — 同 beforeDestroy：preload API 只在 renderer 有，tsconfig.node.json 不带 Window 扩展
   */
  async inputPortReceiveValue(ports: InputPort[]): Promise<void> {
    for (const port of ports) {
      const pair = this.queryPorts.find((p) => p.input === port)
      if (!pair) continue

      const [first] = port.value
      if (!(first instanceof StringValue)) {
        pair.output.clear()
        this.notifyChanged()
        continue
      }

      const sql = first.value.trim()
      if (!sql) {
        pair.output.clear()
        this.notifyChanged()
        continue
      }

      try {
        // @ts-ignore
        const res = await window.tableApi.executeRawSql({ nodeId: this.id, sql })
        if (res.ok) {
          pair.output.commit(new JsonValue(res.rows))
        } else {
          pair.output.clear()
          console.warn('[TableNode] SQL query failed:', res.error)
        }
      } catch (err) {
        pair.output.clear()
        console.warn('[TableNode] SQL query error:', err)
      }
    }
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    return {
      columns: this.columns,
      queryPortIds: this.queryPorts.map((p) => p.id)
    }
  }

  readState(state: Record<string, unknown>): void {
    if (Array.isArray(state.columns)) {
      this.columns = state.columns.filter(
        (c: unknown) => typeof c === 'object' && c !== null && typeof (c as ColumnDef).name === 'string'
      ) as ColumnDef[]
    }

    // 重建动态查询端口对（按持久化 id 顺序）
    if (Array.isArray(state.queryPortIds)) {
      for (const pid of state.queryPortIds) {
        if (typeof pid === 'string') {
          this.addQueryPort(pid)
        }
      }
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

  /** 添加一列，传 ColumnDef 对象。所有可选 UI 元信息（title 等）直接塞进去即可。 */
  addColumn(col: ColumnDef): void {
    this.columns.push(col)
    this.notifyChanged()
  }

  /** 删除一列（不影响已存在的物理表列——那需要 ALTER TABLE，第一期先不做） */
  removeColumn(index: number): void {
    if (index >= 0 && index < this.columns.length) {
      this.columns.splice(index, 1)
      this.notifyChanged()
    }
  }

  /** 更新某列的 UI 元信息（title / width / align 等）。纯 node state，不碰物理表。 */
  updateColumnMeta(index: number, meta: Partial<ColumnDef>): void {
    if (index >= 0 && index < this.columns.length) {
      Object.assign(this.columns[index], meta)
      this.notifyChanged()
    }
  }

  // —— 动态查询端口对管理 ——

  /**
   * 新增一对查询端口（输入 StringValue → 输出 JsonValue）。
   * 运行时调用或 readState 重建都走这个——传入 id 可选，不传时自动生成。
   */
  addQueryPort(existingId?: string): QueryPortPair {
    const id = existingId ?? makeQueryId()
    const idx = this.queryPorts.length

    const input = new InputPort(`sql_in_${id}`, {
      accepts: [StringValue],
      label: queryInputLabel(idx)
    })

    const output = new OutputPort(`sql_out_${id}`, JsonValue, queryOutputLabel(idx))

    // 动态端口登记：addInput push 到 inputs 末尾，addOutput 也 push 到 outputs 末尾
    // 这样 pairs 数组的输入端口和输出端口在各自端口列表里就是对应的顺序
    this.addInput(input)
    this.addOutput(output)

    const pair: QueryPortPair = { id, input, output }
    this.queryPorts.push(pair)
    this.notifyChanged()
    return pair
  }

  /** 删除一对查询端口（自动断开所有连入/连出边） */
  removeQueryPort(id: string): void {
    const idx = this.queryPorts.findIndex((p) => p.id === id)
    if (idx === -1) return
    const pair = this.queryPorts[idx]
    this.queryPorts.splice(idx, 1)
    this.removeInput(pair.input)
    this.removeOutput(pair.output)
  }
}
