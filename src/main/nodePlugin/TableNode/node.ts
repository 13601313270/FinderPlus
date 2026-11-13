import { Node } from '../../engine/node/Node'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { StringValue } from '../../engine/data/StringValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { FileValue } from '../../engine/data/FileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { VideoFileValue } from '../../engine/data/VideoFileValue'

/**
 * 浏览器 File → 纯 base64 字符串（去掉 data URL 前缀）。
 * renderer 侧没有 Node.js Buffer，用 FileReader 实现。
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string // "data:image/png;base64,iVBOR..."
      const commaIdx = dataUrl.indexOf(',')
      resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

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
export type BusinessType = 'text' | 'textarea' | 'number' | 'boolean' | 'color' | 'time' | 'date' | 'image' | 'audio' | 'file'

/** 业务类型 → 存储类型（SQLite DDL 用）的固定映射 */
export const BUSINESS_TYPE_MAP: Record<BusinessType, ColumnType> = {
  text: 'string',
  textarea: 'string',
  number: 'number',
  boolean: 'boolean',
  color: 'string',
  time: 'string',
  date: 'string',
  image: 'string',
  audio: 'string',
  file: 'string'
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

function makeQueryId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`
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

/** 新增行 InputPort label */
const INSERT_INPUT_LABEL = { zh: '新增行·KV JSON', en: 'Insert Row·KV JSON' }

/** insertInput 端口的固定 id，用于在 inputPortReceiveValue 中识别 */
const INSERT_INPUT_ID = 'insert_row'

export class TableNode extends Node {
  static readonly TYPE = 'table'
  readonly type = TableNode.TYPE

  /** 自定义列定义（不含内置自增 id 列） */
  columns: ColumnDef[] = []

  /** 动态查询端口对列表，按 add 顺序排列 */
  readonly queryPorts: QueryPortPair[] = []

  /** 默认新增行的输入端口（KV JSON） */
  readonly insertInput: InputPort

  /** 每次成功执行 INSERT/UPDATE/DELETE 时递增。render.vue 监听它来自动刷新表格数据。 */
  mutationsVersion = 0

  constructor(id: string) {
    super(id)
    // 默认给一个示例 string 列，用户可以在 UI 里改
    this.columns = [{ name: 'name', type: 'string' }]
    // 内容区宽 480px，高 320px（不含端口列）
    this.setBox(480, 320)

    // 默认新增行端口
    this.insertInput = new InputPort(INSERT_INPUT_ID, {
      accepts: [JsonValue],
      label: INSERT_INPUT_LABEL
    })
    this.addInput(this.insertInput)
  }

  override setBox(width: number, height: number): void {
    super.setBox(Math.max(MIN_W, Math.round(width)), Math.max(MIN_H, Math.round(height)))
  }

  /**
   * 把节点 id 清洗成合法的 SQLite 表名（与主进程 sanitizeTableName 完全一致）。
   * 加 tbl_ 前缀，非 [a-zA-Z0-9_] 的字符替换成 _。
   * node.ts 自己拼 SQL（查旧值用）时必须用这个，不能直接用 this.id。
   */
  get tableName(): string {
    const safe = this.id.replace(/[^a-zA-Z0-9_]/g, '_')
    return `tbl_${safe}`
  }

  // —— Node 基类抽象方法 ——

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  /**
   * 异步：收到输入端口值 → 分发到新增行 / 动态查询端口对 → 执行 → commit 输出。
   *
   * @ts-ignore — 同 beforeDestroy：preload API 只在 renderer 有，tsconfig.node.json 不带 Window 扩展
   */
  async inputPortReceiveValue(ports: InputPort[]): Promise<void> {
    this.beginRun()
    try {
      for (const port of ports) {
        // —— 1. 新增行 InputPort ——
        if (port === this.insertInput) {
          await this.handleInsertRow(port)
          continue
        }

        // —— 2. 动态查询端口对 ——
        const pair = this.queryPorts.find((p) => p.input === port)
        if (!pair) continue

        const [first] = port.value
        if (!(first instanceof StringValue) || first.isNull) {
          pair.output.clear()
          continue
        }

        const sql = first.value!.trim()
        if (!sql) {
          pair.output.clear()
          continue
        }

        try {
          // @ts-ignore
          const res = await window.tableApi.executeRawSql({ nodeId: this.id, sql })
          if (res.ok) {
            // @ts-ignore
            if (res.changes > 0) {
              // —— DML（INSERT/UPDATE/DELETE）：带副作用信息 ——
              pair.output.commit(new JsonValue({
                // @ts-ignore
                changes: res.changes,
                // @ts-ignore
                lastInsertRowid: res.lastInsertRowid,
                sql
              }))
              // DML 副作用：render.vue 的 onChanged 检测到 mutationsVersion 变化后自动 loadPage()
              this.mutationsVersion++
            } else {
              // —— SELECT（changes=0）：把 file 类列加工成 FileValue 子类再 commit ——
              const hydratedRows = await this.hydrateFileColumns(res.rows as Record<string, unknown>[])
              pair.output.commit(new JsonValue(hydratedRows))
            }
          } else {
            pair.output.clear()
            console.warn('[TableNode] SQL failed:', res.error, sql)
          }
        } catch (err) {
          pair.output.clear()
          console.warn('[TableNode] SQL error:', err)
        }
      }
    } finally {
      this.completeRun()
    }
  }

  /**
   * 公共：把一个 kv 对象插入到表里（带完整校验 + File 处理）。
   * 所有新增行的入口（上游节点推 insertInput / render.vue 手动新增）都走这里。
   *
   * @param kv  { colName: value } — value 可以是 primitive，也可以是 JS 原生 File
   * @param canvasId  画布 ID；不传时运行时自动兜底（renderer 场景）
   * @returns  { ok: true, newId } 或 { ok: false, error }
   */
  async insertRowValues(
    kv: Record<string, unknown>,
    canvasId?: string
  ): Promise<{ ok: true; newId: number } | { ok: false; error: string }> {
    const resolvedCanvasId = canvasId ?? this.getRuntimeCanvasId()

    // 1. key 校验
    const keyRes = this.validateKeys(kv)
    if (!keyRes.ok) return keyRes

    // 2. File 预处理：存磁盘 → kv 里替换成 relPath
    const fileRes = await this.persistFiles(kv, resolvedCanvasId)
    if (!fileRes.ok) return fileRes

    // 3. 类型校验
    const typeRes = this.validateTypes(kv)
    if (!typeRes.ok) return typeRes

    // 4. 调后端
    try {
      const res = await (window as any).tableApi.insertRow({
        nodeId: this.id,
        columns: this.columns.map(c => ({ name: c.name, type: c.type })),
        values: kv
      })
      if (res.ok) {
        this.mutationsVersion++
        return { ok: true, newId: res.newId }
      }
      return { ok: false, error: res.error ?? 'insertRow failed' }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  /**
   * 公共：更新一行（带完整校验 + File 处理 + 旧文件清理）。
   *
   * 流程：
   *   1. key 校验 → 2. File 预处理（存新文件） → 3. 类型校验
   *   4. 主进程 UPDATE → 5. 成功后删被替换的旧文件（对比 UPDATE 前的旧值）
   *
   * @param rowId  要更新的行 id
   * @param kv  { colName: value } — 允许 File（新图）、string（relPath 或 '' 清空）、primitive
   */
  async updateRowValues(
    rowId: number,
    kv: Record<string, unknown>,
    canvasId?: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const resolvedCanvasId = canvasId ?? this.getRuntimeCanvasId()

    // 1. key 校验
    const keyRes = this.validateKeys(kv)
    if (!keyRes.ok) return keyRes

    // 2. 先查旧值 —— UPDATE 成功后用来判断哪些旧文件要删
    let oldRow: Record<string, unknown> | null = null
    try {
      const qRes = await (window as any).tableApi.executeRawSql({
        nodeId: this.id,
        sql: `SELECT * FROM "${this.tableName}" WHERE id = ${Number(rowId)}`
      })
      if (qRes.ok && Array.isArray(qRes.rows) && qRes.rows.length > 0) {
        oldRow = qRes.rows[0] as Record<string, unknown>
      }
    } catch (err) {
      console.warn('[TableNode] updateRowValues 查旧值失败（不阻塞）：', err)
    }

    // 3. File 预处理：存新文件 → kv 里替换成 relPath
    const replacedByNewFile: Set<string> = new Set()
    const fileRes = await this.persistFiles(kv, resolvedCanvasId, replacedByNewFile)
    if (!fileRes.ok) return fileRes

    // 4. 类型校验
    const typeRes = this.validateTypes(kv)
    if (!typeRes.ok) return typeRes

    // 5. 调后端 UPDATE
    try {
      const res = await (window as any).tableApi.updateRow({
        nodeId: this.id,
        columns: this.columns.map(c => ({ name: c.name, type: c.type })),
        rowId,
        values: kv
      })
      if (!res.ok) {
        return { ok: false, error: res.error ?? 'updateRow failed' }
      }
      this.mutationsVersion++
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }

    // 6. UPDATE 成功后，删被替换/被清空的旧文件
    if (oldRow) {
      // 6a. 被新 File 替换的列
      for (const colName of replacedByNewFile) {
        const oldVal = oldRow[colName]
        if (typeof oldVal === 'string' && oldVal) {
          try {
            await (window as any).tableApi.deleteFile({
              canvasId: resolvedCanvasId,
              nodeId: this.id,
              relPath: oldVal
            })
          } catch (err) {
            console.warn('[TableNode] updateRowValues 删旧文件失败：', colName, oldVal, err)
          }
        }
      }
      // 6b. 用户把 file 列显式清空（传 '' 或 null），也要删旧文件
      for (const col of this.columns) {
        if (replacedByNewFile.has(col.name)) continue
        if (!(col.name in kv)) continue
        const newVal = kv[col.name]
        const oldVal = oldRow[col.name]
        if ((newVal === '' || newVal == null) && typeof oldVal === 'string' && oldVal) {
          try {
            await (window as any).tableApi.deleteFile({
              canvasId: resolvedCanvasId,
              nodeId: this.id,
              relPath: oldVal
            })
          } catch (err) {
            console.warn('[TableNode] updateRowValues 删旧文件失败：', col.name, oldVal, err)
          }
        }
      }
    }

    return { ok: true }
  }

  /**
   * 公共：删除一行，并清理该行关联的文件。
   *
   * 流程：
   *   1. SELECT 旧值 → 拿到所有 file 类列（businessType 为 image/audio/file）的 relPath
   *   2. 主进程 DELETE
   *   3. DELETE 成功后删除旧文件（逐个调 deleteFile，单个失败不阻塞）
   */
  async deleteRowValues(
    rowId: number,
    canvasId?: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const resolvedCanvasId = canvasId ?? this.getRuntimeCanvasId()

    // 1. 先查旧值 —— DELETE 之后就拿不到了
    let oldRow: Record<string, unknown> | null = null
    try {
      const qRes = await (window as any).tableApi.executeRawSql({
        nodeId: this.id,
        sql: `SELECT * FROM "${this.tableName}" WHERE id = ${Number(rowId)}`
      })
      if (qRes.ok && Array.isArray(qRes.rows) && qRes.rows.length > 0) {
        oldRow = qRes.rows[0] as Record<string, unknown>
      }
    } catch (err) {
      console.warn('[TableNode] deleteRowValues 查旧值失败（不阻塞）：', err)
    }

    // 2. 主进程 DELETE
    try {
      const res = await (window as any).tableApi.deleteRow({
        nodeId: this.id,
        rowId: Number(rowId)
      })
      if (!res.ok) {
        return { ok: false, error: res.error ?? 'deleteRow failed' }
      }
      this.mutationsVersion++
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }

    // 3. DELETE 成功后，遍历所有 file 类列的旧值 → 删文件
    if (oldRow) {
      const fileCols = this.columns.filter(
        c => ['image', 'audio', 'file'].includes((c.businessType ?? DEFAULT_BUSINESS_TYPE[c.type]) as string)
      )
      for (const col of fileCols) {
        const oldVal = oldRow[col.name]
        if (typeof oldVal === 'string' && oldVal) {
          try {
            await (window as any).tableApi.deleteFile({
              canvasId: resolvedCanvasId,
              nodeId: this.id,
              relPath: oldVal
            })
          } catch (err) {
            // 单个删失败不阻塞整体——可能之前已经被 updateRowValues 清过了
            console.warn('[TableNode] deleteRowValues 删旧文件失败：', col.name, oldVal, err)
          }
        }
      }
    }

    return { ok: true }
  }

  // —— 内部公共辅助方法（insert 和 update 共用） ——

  /** 运行时兜底取 canvasId */
  private getRuntimeCanvasId(): string {
    if (typeof window === 'undefined') return ''
    const w = window as any
    return typeof w.getCurrentCanvasId === 'function' ? w.getCurrentCanvasId() : ''
  }

  /**
   * 把 SELECT 返回的 rows 里，file 类 businessType 的列从 relPath 字符串
   * 加工成 FileValue 子类实例（ImgFileValue / AudioFileValue / VideoFileValue / FileValue）。
   *
   * 只加工 columns 里能识别到的 file 列名。如果用户写 SELECT * 或显式列名跟
   * TableNode.columns.name 对不上（比如 alias），对应列就跳过，保留原始值。
   *
   * @param rows  executeRawSql 返回的 rows 对象数组（[{ colName: value, ... }, ...]）
   */
  private async hydrateFileColumns(
    rows: Record<string, unknown>[]
  ): Promise<Record<string, unknown>[]> {
    if (!rows.length) return rows

    const canvasId = this.getRuntimeCanvasId()

    // 找出所有需要加工的 file 类列 + 对应的 FileValue 子类构造
    type FileValueCtor = new (file: File, fingerprint: string) => FileValue
    const fileColumns: { name: string; Ctor: FileValueCtor }[] = []
    for (const col of this.columns) {
      const bt = col.businessType ?? DEFAULT_BUSINESS_TYPE[col.type]
      let Ctor: FileValueCtor | null = null
      switch (bt) {
        case 'image': Ctor = ImgFileValue; break
        case 'audio': Ctor = AudioFileValue; break
        case 'file':  Ctor = FileValue; break
      }
      if (Ctor) fileColumns.push({ name: col.name, Ctor })
    }

    if (!fileColumns.length) return rows

    // 预建 relPath → FileValue 的缓存：同一行如果两个 image 列存了同一个文件，只读一次
    const cache = new Map<string, FileValue>()

    // 遍历 rows × fileColumns，并发加载
    const hydrated = await Promise.all(
      rows.map(async (row) => {
        const hydratedRow = { ...row }
        for (const { name, Ctor } of fileColumns) {
          const val = row[name]
          if (typeof val !== 'string' || !val) continue // 不是 relPath，跳过

          if (cache.has(val)) {
            hydratedRow[name] = cache.get(val)!
            continue
          }

          try {
            // @ts-ignore
            const res = await (window as any).tableApi.readFileAsDataUrl({
              // @ts-ignore
              canvasId: canvasId,
              nodeId: this.id,
              relPath: val
            })
            if (res.ok) {
              const file = new File([res.buffer], res.fileName, { type: res.mime })
              const fv = new Ctor(file, val) // fingerprint 先用 relPath 本身，唯一即可
              cache.set(val, fv)
              hydratedRow[name] = fv
            } else {
              console.warn('[TableNode.hydrateFileColumns] 读文件失败：', val, res.error)
            }
          } catch (err) {
            console.warn('[TableNode.hydrateFileColumns] 读文件异常：', val, err)
          }
        }
        return hydratedRow
      })
    )

    return hydrated
  }

  /** key 白名单校验 */
  private validateKeys(kv: Record<string, unknown>):
    | { ok: true }
    | { ok: false; error: string } {
    const validColNames = new Set(this.columns.map(c => c.name))
    const extraKeys = Object.keys(kv).filter(k => !validColNames.has(k))
    if (extraKeys.length > 0) {
      return { ok: false, error: `以下 key 不是表的有效字段：${extraKeys.join(', ')}` }
    }
    return { ok: true }
  }

  // —— File 类型 MIME 校验（static，实例方法通过 TableNode.validateFileMime 调用） ——

  /**
   * File 类 businessType 允许的 MIME 前缀。
   * 用 startsWith 匹配而不是精确 match —— image 可以是 image/png / image/jpeg / image/webp …
   * 'file' 是通用容器，允许任何 MIME（undefined 表示不校验）。
   */
  static readonly FILE_TYPE_MIME_PREFIX: Partial<Record<BusinessType, string[]>> = {
    image: ['image/'],
    audio: ['audio/'],
    file: undefined // 不限制
  }

  /**
   * 检查一个 JS File 的 MIME 类型是否匹配列的 businessType。
   * 'file' 类型允许任何文件；非 File 类 businessType 拒绝 File 值。
   * @returns null 表示通过；string 是错误消息
   */
  static validateFileMime(file: File, col: ColumnDef): string | null {
    const bt = col.businessType ?? DEFAULT_BUSINESS_TYPE[col.type]
    const prefixes = (TableNode.FILE_TYPE_MIME_PREFIX as Record<string, string[] | undefined>)[bt]

    if (prefixes === undefined) {
      // 不是 File 类 businessType 但传了 File 值
      return `字段 "${col.name}" 是 ${bt} 类型，不接受 File 值`
    }

    const mime = file.type ?? ''
    if (!mime) {
      // 有些场景（拖拽、某些浏览器）File.type 是空串，放宽容许
      return null
    }

    const ok = prefixes.some(p => mime.startsWith(p))
    if (!ok) {
      return `字段 "${col.name}" 期望 ${bt} 文件（MIME: ${prefixes.join(' 或 ')}），但收到 ${mime || '未知类型'}（${file.name}）`
    }
    return null
  }

  /**
   * 把 kv 里的 JS 原生 File 存到节点目录，替换成 relPath 字符串。
   * 存之前校验 File 的 MIME 是否匹配列的 businessType。
   *
   * @param replacedKeys  可选——out 参数，被新 File 替换的列名会塞进去（updateRowValues 用来对比旧值删旧文件）
   */
  private async persistFiles(
    kv: Record<string, unknown>,
    canvasId: string,
    replacedKeys?: Set<string>
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    for (const col of this.columns) {
      if (!(col.name in kv)) continue
      const val = kv[col.name]
      if (!(val instanceof File)) continue

      // 1. 先校验 File 的 MIME 类型
      const mimeErr = TableNode.validateFileMime(val, col)
      if (mimeErr) {
        return { ok: false, error: mimeErr }
      }

      // 2. 再存盘
      try {
        const dataBase64 = await fileToBase64(val)
        const saveRes = await (window as any).tableApi.saveFile({
          canvasId,
          nodeId: this.id,
          fileName: val.name || 'untitled',
          dataBase64
        })
        if (!saveRes.ok) {
          return { ok: false, error: `存文件失败（${col.name}）：${saveRes.error}` }
        }
        kv[col.name] = saveRes.relPath
        replacedKeys?.add(col.name)
      } catch (err) {
        return { ok: false, error: `文件读取/存储异常（${col.name}）：${err instanceof Error ? err.message : String(err)}` }
      }
    }
    return { ok: true }
  }

  /** value JS 类型与 ColumnType 匹配校验 */
  private validateTypes(kv: Record<string, unknown>):
    | { ok: true }
    | { ok: false; error: string } {
    const typeErrors: string[] = []
    for (const col of this.columns) {
      if (!(col.name in kv)) continue // 允许缺省字段（后端会处理）
      const val = kv[col.name]
      const expectedType = col.type

      let jsType: string
      if (val === null) jsType = 'null'
      else if (Array.isArray(val)) jsType = 'array'
      else jsType = typeof val

      const matches =
        (expectedType === 'string' && jsType === 'string') ||
        (expectedType === 'number' && jsType === 'number') ||
        (expectedType === 'boolean' && jsType === 'boolean')

      if (!matches) {
        typeErrors.push(`字段 "${col.name}" 期望 ${expectedType}，实际是 ${jsType}`)
      }
    }
    if (typeErrors.length > 0) {
      return { ok: false, error: typeErrors.join('；') }
    }
    return { ok: true }
  }

  /**
   * 处理新增行 InputPort：接收一个 JsonValue（kv 结构），校验后写入 SQLite。
   * 核心逻辑委托给 insertRowValues()，这里只做 JsonValue 拆包 + 错误日志。
   */
  private async handleInsertRow(port: InputPort): Promise<void> {
    const [first] = port.value
    if (!(first instanceof JsonValue) || first.isNull) return

    const raw = first.value
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      console.warn('[TableNode] insertRow 校验失败：传入值必须是 JSON 对象（kv 结构）')
      return
    }

    const res = await this.insertRowValues(raw as Record<string, unknown>)
    if (!res.ok) {
      alert(`[TableNode] insertRow failed: ${res.error}`)
      console.warn('[TableNode] insertRow failed:', res.error)
    }
  }

  getSaveDataByState(): Record<string, unknown> {
    return {
      ...super.getSaveDataByState(),
      columns: this.columns,
      queryPortIds: this.queryPorts.map((p) => p.id),
      box: this.box as readonly [number, number]
    }
  }

  initStateBySaveData(state: Record<string, unknown>): void {
    super.initStateBySaveData(state)

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

    // 恢复用户拖过的尺寸；老存档没存 box，保持构造默认值
    const box = state.box
    if (Array.isArray(box) && box.length === 2 && typeof box[0] === 'number' && typeof box[1] === 'number') {
      this.setBox(Math.round(box[0]), Math.round(box[1]))
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
      // @ts-ignore — renderer 里有 window.tableApi 和 getCurrentCanvasId
      await window.tableApi.drop({
        nodeId: this.id,
        // @ts-ignore
        canvasId: window.getCurrentCanvasId()
      })
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
   * 运行时调用或 initStateBySaveData 重建都走这个——传入 id 可选，不传时自动生成。
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
