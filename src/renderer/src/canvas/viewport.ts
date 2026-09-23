import { reactive } from 'vue'

/**
 * 无限画布的视口状态：平移偏移（屏幕像素）+ 缩放倍率。
 *
 * 为什么做成进程内共享的模块级单例：App.vue 要把视口映射成 CSS transform，
 * 而节点渲染组件拖拽时又要把「屏幕位移」换算成「世界位移」——两端都得读同一份
 * 缩放值。用 reactive 单例共享，比在组件间层层 prop / provide 更直接。
 *
 * 坐标约定：
 * - 世界坐标：Node.position 存的就是世界坐标，画布无限大，节点落在上面；
 * - 屏幕坐标：某个点在画布容器里的像素位置，满足「屏幕 = 世界 × scale + 平移偏移」。
 */
export interface CanvasViewportState {
  /** 平移 x（屏幕像素）：世界原点在画布容器里的水平偏移 */
  x: number
  /** 平移 y（屏幕像素） */
  y: number
  /** 缩放倍率，恒 > 0 */
  scale: number
}

export const VIEWPORT_MIN_SCALE = 0.2
export const VIEWPORT_MAX_SCALE = 4

/** 进程内共享的视口单例。别直接改字段，统一走下面的函数。 */
export const viewport = reactive<CanvasViewportState>({
  x: 0,
  y: 0,
  scale: 1
})

function clampScale(value: number): number {
  return Math.min(VIEWPORT_MAX_SCALE, Math.max(VIEWPORT_MIN_SCALE, value))
}

/** 平移：dx/dy 是屏幕像素增量（拖拽空白、滚轮平移都走这里） */
export function panViewport(dx: number, dy: number): void {
  viewport.x += dx
  viewport.y += dy
}

/**
 * 以画布内某个屏幕点为锚缩放：缩放前后，该点「底下」的世界坐标保持不变，
 * 光标指哪就朝哪缩放，内容不会漂移。
 *
 * 推导：屏幕 = 世界 × scale + 平移，要求 世界 不变、scale → scale'，
 * 得 平移' = 屏幕 − (屏幕 − 平移) × (scale' / scale)。
 *
 * @param px 画布容器内的屏幕 x
 * @param py 画布容器内的屏幕 y
 * @param factor 缩放倍率（>1 放大，<1 缩小）
 */
export function zoomViewportAt(px: number, py: number, factor: number): void {
  const next = clampScale(viewport.scale * factor)
  const k = next / viewport.scale
  viewport.x = px - (px - viewport.x) * k
  viewport.y = py - (py - viewport.y) * k
  viewport.scale = next
}

/** 复位到初始视图：世界原点对齐容器左上角、100% 缩放 */
export function resetViewport(): void {
  viewport.x = 0
  viewport.y = 0
  viewport.scale = 1
}

/**
 * 不改变缩放，把指定**世界点**平移到画布中央（小地图点击 / 拖拽导航用）。
 * 由 屏幕 = 世界 × scale + 平移，要求该世界点落到屏幕中心，得 平移 = 屏幕中心 − 世界 × scale。
 *
 * @param wx 目标世界 x
 * @param wy 目标世界 y
 * @param width 画布容器屏幕宽
 * @param height 画布容器屏幕高
 */
export function centerViewportOn(wx: number, wy: number, width: number, height: number): void {
  viewport.x = width / 2 - wx * viewport.scale
  viewport.y = height / 2 - wy * viewport.scale
}
