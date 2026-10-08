import { ref, type ComponentPublicInstance, type Ref } from 'vue'
import type { LocalizedText } from '../../../shared/language'

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
  /** 输入端口才有：允许接入的 Value 类型标签名 */
  readonly acceptValueNames?: readonly string[]
  /** 输出端口才有：产出的 Value 类型标签名 */
  readonly outputValueName?: string
  /**
   * 端口文本标记，用于在圆点旁显示。多语言表（LocalizedText），按当前语言解析、兜底英语；
   * 不填则回退到 id。
   */
  readonly label?: LocalizedText
  /**
   * 输入端口才有：订阅本端口的边绑定/解绑事件。返回取消订阅函数。
   * 事件载荷里的 edge 由引擎层持有，renderer 拿到后按需使用即可。
   */
  readonly onEdgeBinding?: (
    fn: (event: { readonly kind: 'bind' | 'unbind'; readonly edge: unknown }) => void
  ) => () => void
  /**
   * 输入端口才有：未接边时默认值的可读标签。
   * 渲染层用它判断是否要把圆点变胶囊形状。
   */
  readonly defaultValueLabel?: string
  /**
   * 输入端口才有：当前接入的边数量。渲染层用来初始化连接状态。
   */
  readonly incomingEdgeCount?: number
  /**
   * 输入端口才有：缓存的输入值标签列表，按端口 value getter 顺序。
   * 渲染层 tooltip 用它展示端口上当前挂着的数据。
   */
  readonly currentValues?: readonly string[]
  /**
   * 输出端口才有：缓存的输出值标签。
   * 渲染层 tooltip 用它展示节点产出了什么。
   */
  readonly currentValueLabel?: string
  /**
   * 输入端口才有：当前生效值里所有 FileValue 子类携带的 File 对象（无文件值时空数组）。
   * 渲染层 tooltip 按 mimeType 过滤出图片，用 createObjectURL 做预览。
   */
  readonly currentValueFiles?: readonly File[]
  /**
   * 输出端口才有：当前产出值若为 FileValue 子类则返回其 File，否则 undefined。
   */
  readonly currentValueFile?: File | undefined
  /**
   * 隐藏端口 label 文字（圆点仍然显示）。
   * 典型场景：节点内部已有文字说明每个端口的含义，再显示 label 就是冗余。
   */
  readonly isHiddenLabel?: boolean
}

/** 能提供端口的节点（Node 基类的最小结构子集），NodePorts 用它枚举两侧端口 */
export interface PortsOwnerLike {
  readonly id: string
  readonly inputPorts: readonly PortLike[]
  readonly outputPorts: readonly PortLike[]
  readonly methodPorts?: readonly PortLike[]
}

/** 端口长在卡片哪一侧 */
export type PortSide = 'in' | 'out' | 'method'

const nodeElements = new Map<string, HTMLElement>()

/**
 * 端口圆点注册表：键是 `${节点id}:${侧}:${端口id}` 这样的**字符串**，而不是端口对象。
 *
 * 为什么不用对象当键：render.vue 里的节点引用常被 Vue 包了一层（`ref(node)` 会把普通对象
 * 深转换成 reactive 代理），从代理上读到的端口对象，和引擎里那条边持有的原始端口**不是同一个
 * 引用**；按对象身份查表会全部落空，连线于是退回卡片边线（这个是实测踩出来的坑）。
 * 用「节点 + 侧 + 端口 id」这套地址说话，代理与否都一样，地址稳定。
 *
 * 存 nodeId / portId 而不是只存元素：拖拽连线落点时要按 id 回场景里取真端口，
 * 从键字符串里切分不如登记时直接留下。
 */
interface RegisteredPort {
  readonly el: HTMLElement
  readonly side: PortSide
  readonly nodeId: string
  readonly portId: string
}

const portElements = new Map<string, RegisteredPort>()

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
  let attachedEl: HTMLElement | null = null
  return elementRef(
    (el) => {
      attachedEl = el
      nodeElements.set(id, el)
      resizeObserver.observe(el)
      version.value++
    },
    () => {
      const current = nodeElements.get(id)
      if (current === attachedEl) {
        current && resizeObserver.unobserve(current)
        nodeElements.delete(id)
        version.value++
      }
      attachedEl = null
    }
  )
}

/**
 * 端口圆点交给注册表。同一个端口必须拿到同一个函数 ref（NodePorts 里做了缓存）。
 *
 * cleanup 时加了"只删自己 setup 的那个 el"守卫：防止节点在 FolderNode 嵌套壳 ↔ App.vue 顶层壳
 * 之间切换时，旧壳的 cleanup 把新壳刚 setup 的同 key 条目误删掉，导致 measurePortCenter 拿不到
 * 真实圆点位置，连线退回 card-edge 兜底（比真实端口更靠右）。
 */
export function portElementRef(nodeId: string, side: PortSide, port: PortLike): CanvasElementRef {
  const key = portKey(nodeId, side, port.id)
  let attachedEl: HTMLElement | null = null

  return elementRef(
    (el) => {
      attachedEl = el
      // 顺手在 DOM 上留个记号，方便在开发者工具里认出「这个圆点是哪个节点的哪个端口」
      el.dataset.port = key
      portElements.set(key, { el, side, nodeId, portId: port.id })
      version.value++
    },
    () => {
      // 只有注册表当前存的就是我当初 setup 的那个 DOM 元素才删——
      // 竞争条件下新壳可能已经 setup 覆盖了同 key，我不能把它一起删了
      const current = portElements.get(key)
      if (current && current.el === attachedEl) {
        portElements.delete(key)
        version.value++
      }
      attachedEl = null
    }
  )
}

/** 拖拽连线时命中的端口：注册键 + 它属于谁 + 圆心屏幕坐标 */
export interface PortHit {
  readonly key: string
  readonly nodeId: string
  readonly portId: string
  /** 命中的端口属于哪一侧 */
  readonly side: PortSide
  /** 圆心屏幕坐标（client 坐标系） */
  readonly clientX: number
  readonly clientY: number
}

/**
 * 找出离某个**屏幕点**最近的某一侧端口圆点（超出 radius 就算没命中）。
 *
 * 半径按**屏幕像素**算，不折算世界坐标：缩到 20% 时圆点只有两三个像素，
 * 但落点手感不该跟着变小，仍然留同样的容错。
 *
 * @param side 可选——只搜索指定侧的端口。传 undefined 时搜索所有侧。
 */
export function findPortNear(
  clientX: number,
  clientY: number,
  side: PortSide | undefined,
  radius: number
): PortHit | null {
  let best: PortHit | null = null
  let bestDistance = radius

  portElements.forEach((registered, key) => {
    if (side !== undefined && registered.side !== side) return
    const rect = registered.el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const distance = Math.hypot(centerX - clientX, centerY - clientY)
    if (distance > bestDistance) return

    bestDistance = distance
    best = {
      key,
      nodeId: registered.nodeId,
      portId: registered.portId,
      side: registered.side,
      clientX: centerX,
      clientY: centerY
    }
  })

  return best
}

/** 量出某个节点的世界矩形：位置取引擎值，宽高取真实布局（外壳尺寸 = 卡片尺寸）。
 *  可选传入 node.box（内容区宽高，0 = 该轴不约束）：双轴都非 0 时走确定性——
 *  外壳 = { content box + 两侧端口列 40px, box 高 }，不依赖 DOM 测量时序。 */
export function measureNodeBox(
  id: string,
  position: readonly [number, number],
  box?: readonly [number, number]
): NodeBox {
  if (box && box[0] > 0 && box[1] > 0) {
    return { x: position[0], y: position[1], width: box[0], height: box[1] }
  }
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
 * —— 为什么不用 offsetParent 链累加（之前的方案）——
 *
 * 旧方案沿 offsetParent 链累加 offsetLeft/offsetTop + clientLeft/Top，再
 * 加 node.position 得到世界坐标。但 offsetLeft/Top 都是**整数值**，会丢弃
 * 浏览器在以下场景产生的 sub-pixel：
 *
 *   - ports-col 用 space-evenly 均分 port-item，容器高度不能整除时会产生 0.5px
 *     级的 sub-pixel 分配，offsetTop 把它四舍五入吞掉；
 *   - port 圆点有负 margin 探出 ports-col 边缘，负 margin 参与 flex 空间分配
 *     时浏览器同样会产生 sub-pixel，offsetLeft 取整丢失精度。
 *
 * 世界层有 scale 时，0.5px 的世界误差在屏幕上被放大到 0.5 × scale 像素，
 * 肉眼就能看出"线没正好落在圆点中心"。
 *
 * —— 新方案：用真实渲染后的浮点 rect 做比例换算 ——
 *
 * 1. 量 dot 和 shell 的 getBoundingClientRect() —— 都是**浮点**屏幕坐标，
 *    包含世界层 transform 的缩放和平移；
 * 2. 算出 dot 中心相对 shell 左上角的**屏幕偏移**；
 * 3. 用 shell 自己的 scale（rect.width / offsetWidth）反算成**世界偏移**——
 *    offsetWidth 是不受 transform 影响的布局尺寸，rect.width 是经过 transform
 *    的屏幕尺寸，两者之比就是 world 层当前的 scale；
 * 4. 世界坐标 = node.position + 世界偏移。
 *
 * 全程不读 viewport reactive → Vue computed 不会把 viewport 当依赖，
 * pan/zoom 时 lines 不会被迫重算，保持原有的高效路径：EdgeLayer 算一次，
 * 世界层 transform 带着里面的 SVG 一起动。
 */
export function measurePortCenter(
  nodeId: string,
  nodePosition: readonly [number, number],
  side: PortSide,
  port: PortLike
): Vec2 | undefined {
  const registered = portElements.get(portKey(nodeId, side, port.id))
  if (!registered) return undefined

  const dot = registered.el
  const shell = nodeElements.get(nodeId)
  if (!shell) return undefined

  // shell 刚挂载完还没 layout 时 offsetWidth/Height 是 0，除零会产生 NaN/Infinity
  // 并一路传下去变成坏掉的线。这里 return undefined，让调用方走 card-edge 中点兜底。
  if (shell.offsetWidth === 0 || shell.offsetHeight === 0) return undefined

  const dotRect = dot.getBoundingClientRect()
  const shellRect = shell.getBoundingClientRect()

  // 垂直方向取圆点中心；水平方向固定取「靠近 content 那侧的边缘往里 7px」——
  // 这样无论端口是 12px 圆还是胶囊，连线锚点都钉死在 content 侧线上，
  // 不会随端口 DOM 宽度变化而漂移
  let screenOffsetX: number
  let screenOffsetY: number

  if (side === 'method') {
    // 底部方法端口（三角形朝上）：锚点在三角形顶部尖端
    // 水平：三角形水平中心
    // 垂直：三角形顶部边缘往下 7px（靠近 content 那侧）
    screenOffsetX = dotRect.left + dotRect.width / 2 - shellRect.left
    screenOffsetY = dotRect.top + 7 - shellRect.top
  } else {
    // 输入 / 输出端口（圆点）
    screenOffsetY = dotRect.top + dotRect.height / 2 - shellRect.top
    screenOffsetX = side === 'in'
      ? dotRect.right - 7 - shellRect.left   // 输入端口：端口右边缘往左 7px
      : dotRect.left + 7 - shellRect.left    // 输出端口：端口左边缘往右 7px
  }

  // 把屏幕偏移换算成**世界**偏移：
  //   shellRect.width  = shell.offsetWidth × viewport.scale
  //   世界偏移 = 屏幕偏移 / scale = 屏幕偏移 × (shell.offsetWidth / shellRect.width)
  const scaleX = shellRect.width / shell.offsetWidth
  const scaleY = shellRect.height / shell.offsetHeight

  return {
    x: nodePosition[0] + screenOffsetX / scaleX,
    y: nodePosition[1] + screenOffsetY / scaleY
  }
}
