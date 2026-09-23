import { ref, type ComponentPublicInstance, type Ref } from 'vue'

/**
 * 画布元素的登记与测量：节点外壳多大、端口圆点在哪。
 *
 * 连线要落到**端口**上（哪个端口输出、连到哪个端口输入），所以必须知道端口圆点在画布上的
 * 真实位置。这些尺寸一概不写进引擎——宽度由 CSS 定、高度随内容变、端口位置按端口个数均分——
 * 一律以**真实布局**为准：
 *
 * - 外壳：NodeShell 用 nodeElementRef(id) 登记根元素，位置取 Node.position（左上角），
 *   宽高用 offsetWidth / offsetHeight；
 * - 端口：NodePorts 组件用 portElementRef(nodeId, side, port) 登记每个圆点，位置按「相对
 *   外壳边框盒的偏移」量出来，再加上节点的世界坐标。
 *
 * offsetWidth / offsetHeight / offsetLeft / offsetTop 都是**布局值**，不受世界层 transform 的
 * 缩放影响，所以读出来直接用，不必再除以 viewport.scale。
 *
 * 响应式桥：注册表和元素尺寸都不是 Vue 响应式的，用一个自增计数 canvasLayoutVersion 代替——
 * 「登记 / 注销 / ResizeObserver 报尺寸变化」都 +1，连线层把它当依赖，重新量一次几何。
 */

/** 卡片还没登记时的兜底尺寸（世界像素），只在节点挂载的那一帧可能用到 */
export const FALLBACK_NODE_SIZE = { width: 220, height: 80 } as const

/** 世界坐标里的一个点 */
export interface Vec2 {
  readonly x: number
  readonly y: number
}

/** 节点卡片在世界坐标里的矩形：左上角 + 宽高 */
export interface NodeBox {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * 端口在测量 / 渲染眼里长什么样：能读出 id 就够了。
 * 不用引擎的 InputPort / OutputPort 类做参数类型：它们带 private 字段，跨编译单元
 * 解析时会被 vue-tsc 当成「结构不同」的类型（useNodePosition 里踩过同一个坑）。
 */
export interface PortLike {
  readonly id: string
  /** 输入端口才有：允许接入的类型 */
  readonly accepts?: readonly string[]
  /** 输出端口才有：产出的类型 */
  readonly kind?: string
}

/** 能提供端口的节点（Node 基类的最小结构子集），NodePorts 用它枚举两侧端口 */
export interface PortsOwnerLike {
  readonly id: string
  readonly inputPorts: readonly PortLike[]
  readonly outputPorts: readonly PortLike[]
}

/** 端口长在卡片哪一侧 */
export type PortSide = 'in' | 'out'

const nodeElements = new Map<string, HTMLElement>()

/**
 * 端口圆点注册表：键是 `${节点id}:${侧}:${端口id}` 这样的**字符串**，而不是端口对象。
 *
 * 为什么不用对象当键：render.vue 里的节点引用常被 Vue 包了一层（`ref(node)` 会把普通对象
 * 深转换成 reactive 代理），从代理上读到的端口对象，和引擎里那条边持有的原始端口**不是同一个
 * 引用**；按对象身份查表会全部落空，连线于是退回卡片边线（这个是实测踩出来的坑）。
 * 用「节点 + 侧 + 端口 id」这套地址说话，代理与否都一样，地址稳定。
 */
const portElements = new Map<string, HTMLElement>()

/** 端口圆点在注册表里的地址 */
export function portKey(nodeId: string, side: PortSide, portId: string): string {
  return `${nodeId}:${side}:${portId}`
}

/** 布局版本号。值本身没意义，只用来当「该重新量了」的响应式信号 */
const version = ref(0)

export const canvasLayoutVersion: Ref<number> = version

/** 卡片尺寸会随内容变化（展示节点文本换行就是），所以尺寸变化也得算一次「变了」 */
const resizeObserver = new ResizeObserver(() => {
  version.value++
})

/** 绑定到模板 `:ref` 上的函数 ref 类型 */
export type CanvasElementRef = (el: Element | ComponentPublicInstance | null) => void

/**
 * 函数 ref 的公共部分：挂载 / 卸载由 Vue 自己回调（卸载时以 null 调一次），组件不必写
 * onMounted / onUnmounted；按「元素引用有没有变」去重，因为函数 ref 在元素每次 patch 时
 * 都会被调一次，重复调用不该让 version 空转。
 */
function elementRef(onAttach: (el: HTMLElement) => void, onDetach: () => void): CanvasElementRef {
  let current: HTMLElement | null = null

  return (el) => {
    const next = el instanceof HTMLElement ? el : null
    if (next === current) return

    if (current) onDetach()
    current = next
    if (next) onAttach(next)
  }
}

/** 卡片根元素交给注册表：`const nodeEl = nodeElementRef(props.id)`，模板里 `:ref="nodeEl"` */
export function nodeElementRef(id: string): CanvasElementRef {
  return elementRef(
    (el) => {
      nodeElements.set(id, el)
      resizeObserver.observe(el)
      version.value++
    },
    () => {
      const el = nodeElements.get(id)
      if (el) resizeObserver.unobserve(el)
      nodeElements.delete(id)
      version.value++
    }
  )
}

/** 端口圆点交给注册表。同一个端口必须拿到同一个函数 ref（NodePorts 里做了缓存） */
export function portElementRef(nodeId: string, side: PortSide, port: PortLike): CanvasElementRef {
  const key = portKey(nodeId, side, port.id)

  return elementRef(
    (el) => {
      // 顺手在 DOM 上留个记号，方便在开发者工具里认出「这个圆点是哪个节点的哪个端口」
      el.dataset.port = key
      portElements.set(key, el)
      version.value++
    },
    () => {
      portElements.delete(key)
      version.value++
    }
  )
}

/** 量出某个节点的世界矩形：位置取引擎值，宽高取真实布局（外壳尺寸 = 卡片尺寸） */
export function measureNodeBox(id: string, position: readonly [number, number]): NodeBox {
  const el = nodeElements.get(id)
  return {
    x: position[0],
    y: position[1],
    width: el?.offsetWidth || FALLBACK_NODE_SIZE.width,
    height: el?.offsetHeight || FALLBACK_NODE_SIZE.height
  }
}

/**
 * 端口圆点的中心（世界坐标）。圆点还没登记时返回 undefined，由调用方兜底。
 *
 * 圆点相对外壳的偏移 = offsetLeft/Top + 自身一半 + 外壳边框宽（clientLeft/Top）：
 * offsetLeft 是相对 offsetParent 的 **padding 边**算的，而节点世界坐标对应外壳的
 * **边框盒**左上角，差的正是边框宽，补上才对得齐。
 * 前提是圆点的 offsetParent 就是外壳本身 —— NodePorts 不套中间容器，外壳又是定位元素。
 *
 * offsetLeft / offsetTop 取整到像素（端口按百分比分布，落点常带小数），所以结果可能有
 * 半像素以内的误差——端点被 12px 的圆点盖住，看不出来，不值得为此去读 getBoundingClientRect
 * 再把 scale 除回来。
 */
export function measurePortCenter(
  nodeId: string,
  nodePosition: readonly [number, number],
  side: PortSide,
  port: PortLike
): Vec2 | undefined {
  const dot = portElements.get(portKey(nodeId, side, port.id))
  if (!dot) return undefined

  const card = nodeElements.get(nodeId)
  return {
    x: nodePosition[0] + dot.offsetLeft + dot.offsetWidth / 2 + (card?.clientLeft ?? 0),
    y: nodePosition[1] + dot.offsetTop + dot.offsetHeight / 2 + (card?.clientTop ?? 0)
  }
}
