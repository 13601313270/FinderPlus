import { reactive, ref } from 'vue'

/**
 * 画布装饰元素：纯粹用于布局设计的视觉元素，不是节点、不参与数据流。
 * 渲染层级在世界层里最底部（EdgeLayer 和 NodeShell 之下）。
 *
 * 当前支持：矩形
 * 后续可扩展：圆形、三角形、文字标注等
 */

/** 装饰元素的公共字段 */
interface BaseDecor {
  readonly id: string
  /** 世界坐标 x */
  x: number
  /** 世界坐标 y */
  y: number
  /** 世界坐标下的宽度 */
  width: number
  /** 世界坐标下的高度 */
  height: number
  /** 左上角标题，空字符串表示不显示 */
  title: string
  /** 标题颜色 */
  titleColor: string
}

/** 矩形装饰元素 */
export interface RectDecor extends BaseDecor {
  readonly type: 'rect'
  /** 填充色，空字符串表示透明 */
  fill: string
  /** 边框色，空字符串表示无边框 */
  stroke: string
  /** 边框宽度（世界像素） */
  strokeWidth: number
  /** 圆角半径（世界像素） */
  radius: number
}

/** 所有装饰元素的联合类型 */
export type Decor = RectDecor

/** 生成唯一 id */
function genId(): string {
  return `decor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * 画布装饰元素的响应式状态容器。
 * 用 reactive 数组直接暴露，组件 v-for 就能自动追踪。
 */
export const decorList = reactive<Decor[]>([])

/** 选中的装饰元素 id 集合（Set 方便 O(1) 查找） */
export const selectedDecorIds = reactive<Set<string>>(new Set())

/** 装饰元素的选中状态版本号——供选中框组件订阅 */
export const decorSelectionVersion = { value: 0 }

/**
 * 当前绘制模式：
 * - null：非绘制模式（正常画布交互）
 * - 'rect'：正在画矩形
 */
export const drawingMode = ref<null | 'rect'>(null)

/** 绘制过程中的临时预览矩形（拖拽过程中实时更新） */
export const drawingPreview = ref<{
  startX: number
  startY: number
  endX: number
  endY: number
} | null>(null)

// —— 持久化：逐条 upsert，每个 decor 独立 debounce 500ms ——
const persistTimers = new Map<string, ReturnType<typeof setTimeout>>()

function schedulePersist(decor: Decor): void {
  const key = decor.id
  const existing = persistTimers.get(key)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    persistTimers.delete(key)
    // eslint-disable-next-line no-console
    console.log('[decor] schedulePersist → saveDecor IPC', decor.id, decor.type, { x: decor.x, y: decor.y, w: decor.width, h: decor.height })
    const canvasId = window.getCurrentCanvasId()
    window.canvasDeskDb?.saveDecor({ decor: toRow(decor), canvasId }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[decor] saveDecor IPC fail', decor.id, err)
    })
  }, 500)
  persistTimers.set(key, timer)
}

/** Decor → 数据库行（字段名对齐 decors 表 + preload saveDecor 签名） */
function toRow(d: Decor): {
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
} {
  return {
    id: d.id,
    type: d.type,
    x: d.x,
    y: d.y,
    width: d.width,
    height: d.height,
    fill: d.fill,
    stroke: d.stroke,
    strokeWidth: d.strokeWidth,
    radius: d.radius,
    title: d.title,
    titleColor: d.titleColor
  }
}

/** 清空所有待触发的持久化定时器（组件卸载时调） */
export function cancelPersist(): void {
  for (const t of persistTimers.values()) clearTimeout(t)
  persistTimers.clear()
}

// —— 操作函数 ——

/** 进入绘制模式 */
export function enterDrawingMode(mode: 'rect'): void {
  drawingMode.value = mode
  document.body.style.cursor = 'crosshair'
}

/** 退出绘制模式 */
export function exitDrawingMode(): void {
  drawingMode.value = null
  drawingPreview.value = null
  document.body.style.cursor = ''
}

/**
 * 添加矩形装饰元素
 */
export function addRect(opts: {
  x: number
  y: number
  width: number
  height: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  radius?: number
  title?: string
  titleColor?: string
}): RectDecor {
  const decor: RectDecor = {
    id: genId(),
    type: 'rect',
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    title: opts.title ?? '',
    titleColor: opts.titleColor ?? '#6b7280',
    fill: opts.fill ?? '#ffffff',
    stroke: opts.stroke ?? '#c4c9d2',
    strokeWidth: opts.strokeWidth ?? 1,
    radius: opts.radius ?? 4
  }
  decorList.push(decor)
  // eslint-disable-next-line no-console
  console.log('[decor] addRect → saveDecor IPC', decor.id, { x: decor.x, y: decor.y, w: decor.width, h: decor.height })
  // 新元素立即持久化（不走 debounce，一次 IPC）
  const canvasId = window.getCurrentCanvasId()
  window.canvasDeskDb?.saveDecor({ decor: toRow(decor), canvasId }).catch(() => {})
  return decor
}

/** 删除指定 id 的装饰元素 */
export function removeDecor(id: string): void {
  const idx = decorList.findIndex((d) => d.id === id)
  if (idx >= 0) {
    // eslint-disable-next-line no-console
    console.log('[decor] removeDecor → deleteDecor IPC', id)
    // 清掉该元素的待触发持久化
    const t = persistTimers.get(id)
    if (t) {
      clearTimeout(t)
      persistTimers.delete(id)
    }
    decorList.splice(idx, 1)
    selectedDecorIds.delete(id)
    decorSelectionVersion.value++
    // 立即 DELETE，不走 debounce
    const canvasId = window.getCurrentCanvasId()
    window.canvasDeskDb?.deleteDecor({ id, canvasId }).catch(() => {})
  }
}

/** 清空所有装饰元素 */
export function clearAllDecors(): void {
  if (decorList.length > 0) {
    cancelPersist()
    decorList.splice(0, decorList.length)
    selectedDecorIds.clear()
    decorSelectionVersion.value++
  }
}

/** 选中指定装饰元素（单选，不保留之前的选中） */
export function selectDecor(id: string | null): void {
  selectedDecorIds.clear()
  if (id) {
    selectedDecorIds.add(id)
  }
  decorSelectionVersion.value++
}

/** 取消所有选中 */
export function clearDecorSelection(): void {
  if (selectedDecorIds.size > 0) {
    selectedDecorIds.clear()
    decorSelectionVersion.value++
  }
}

/** 判断某个世界坐标点是否命中了某个装饰元素（用于选中） */
export function hitTestDecor(worldX: number, worldY: number): Decor | null {
  // 从后往前遍历，后绘制的在上层，优先命中
  for (let i = decorList.length - 1; i >= 0; i--) {
    const d = decorList[i]
    if (
      worldX >= d.x &&
      worldX <= d.x + d.width &&
      worldY >= d.y &&
      worldY <= d.y + d.height
    ) {
      return d
    }
  }
  return null
}

/**
 * 通知持久化（在外部直接改 decor.x/y/width/height 等属性后调）
 * 每个 decor 独立 debounce 500ms，拖动/resize 停了再写
 */
export function decorChanged(decor: Decor): void {
  // eslint-disable-next-line no-console
  console.log('[decor] decorChanged called', decor.id)
  schedulePersist(decor)
}

/**
 * 从数据库恢复装饰元素数组（启动时调）
 * 新库返回空数组 → decorList 本来就是空的，跳过即可
 */
export function restoreDecors(rows: Array<{
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
}>): void {
  // eslint-disable-next-line no-console
  console.log('[decor] restoreDecors called, rows.length =', rows?.length ?? 0, rows)
  if (!rows || rows.length === 0) return
  const arr = rows.map((r): Decor => ({
    id: r.id,
    type: r.type as Decor['type'],
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    fill: r.fill,
    stroke: r.stroke,
    strokeWidth: r.strokeWidth,
    radius: r.radius,
    title: r.title,
    titleColor: r.titleColor
  } as Decor))
  decorList.splice(0, decorList.length, ...arr)
  // eslint-disable-next-line no-console
  console.log('[decor] restoreDecors done, decorList.length =', decorList.length)
}
