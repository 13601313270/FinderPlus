import { computed, watch, ref, type Ref } from 'vue'
import { viewport } from '@renderer/canvas/viewport'

/**
 * 本逻辑只依赖节点这几个可见成员。
 * 不直接用 `Node` 做参数类型：Node 基类带 private 字段，在 vue-tsc 跨编译单元解析
 * 时会被当成「结构不同」的类型，导致实测可用的节点实例也标红；
 * 换成成员结构等价的最小接口，App/节点实现测都能通过。
 */
export interface NodeLike {
  /** 节点唯一 id，App 结算时用它从 Scene 找回真实 Node 实例 */
  readonly id: string
  readonly type: string
  readonly position: readonly [number, number]
  readonly box: readonly [number, number]
  setPosition(x: number, y: number): void
  onChanged(fn: () => void): () => void
  /** 被拖节点视觉态：正被某个可接收节点悬停命中时变 true */
  readonly nodeDropAcceptedValue?: boolean
}

/**
 * useNodePosition 的可选配置——启用"拖出窗口 → 交给 OS 级文件拖拽"能力。
 *
 * 不传 opts（或 enableDragOut = false）时，行为和原来完全一致：
 * pointermove 始终 setPosition，直到 pointerup 结束。
 *
 * 传了 enableDragOut = true 后，pointermove 会额外检测鼠标是否越出窗口边界
 * （clientX/Y < 0 或 > innerWidth/innerHeight）。
 * - 越界后不是立即 startDrag，而是等 confirmDelayMs——这就是"反悔窗口"：
 *   300ms 内用户又回到窗口内 → 取消定时器，继续内部拖拽；
 *   超时还在窗口外 → 清理 pointer 监听、调 opts.onDragOut() 交给外部。
 * - 这样"不小心滑出去又回来"的场景不会误触 OS 拖拽，也就不需要"取消 startDrag"
 *   （Electron startDrag 没有 cancel API）。
 *
 * onDragOut 会收到 startDrag 时节点的原始位置：因为越界前节点已经被 setPosition
 * 跟着鼠标移动过了，OS 级拖拽是文件级操作，画布上的节点应该回到按下前的位置。
 */
export interface DragOutOpts {
  /** 是否启用"拖出窗口边界 → 交给外部"能力。非文件节点保持 false（默认） */
  enableDragOut?: boolean
  /** 越界确认延迟 ms，默认 0（立即触发）。建议文件节点设 200-300ms 做反悔窗口 */
  confirmDelayMs?: number
  /** 越界确认后回调；参数是 startDrag 时节点的原始位置，调用方应还原它 */
  onDragOut?: (startPos: readonly [number, number]) => void
}

/**
 * 当前正在被拖拽的节点（模块级单例）。
 *
 * 用途：把「节点拖到另一个节点上」的结算交给 App 全局调度——被拖节点 A
 * 只负责移动、不感知任何投放语义；useNodePosition 在 startDrag 时把 A 记到这里，
 * App.vue 在松手事件里读它 + 鼠标坐标命中目标 B，再调 B.onNodeDrop(A, startPos)。
 *
 * 清除由 App 统一做（松手结算完成后置 null），useNodePosition 不负责——
 * 避免 App 的 pointerup 处理器和本组合式函数的 end() 触发顺序互相踩。
 */
let draggingNode: NodeLike | null = null

/** 被拖节点的拖拽前局部坐标：startDrag 时记录，松手结算时传给目标节点的 onNodeDrop */
let draggingNodeStartPos: [number, number] | null = null

/** 读取当前正在被拖拽的节点（App 的松手结算用） */
export function getDraggingNode(): NodeLike | null {
  return draggingNode
}

/** 读取被拖节点拖拽前的局部坐标（App 传给 onNodeDrop 用，目标节点自行决定是否还原） */
export function getDraggingNodeStartPos(): readonly [number, number] | null {
  return draggingNodeStartPos
}

/** 清除拖拽记录。App 在松手结算完成后调用（含「未命中任何接收节点」的情况） */
export function clearDraggingNode(): void {
  draggingNode = null
  draggingNodeStartPos = null
}

/**
 * 「位置 + 拖拽」共用逻辑：两个节点视图都要把卡片拖来拖去、并把落点写回
 * node.setPosition。拖拽只认引擎里的 position 为单一真相源——
 * - startDrag 记录起点，pointermove 算出增量后实时 setPosition；
 * - 只要 node 的 position 变了（无论是不是这场拖拽改的），都用 onChanged 刷回本地 ref。
 *
 * 传进来的 getNode 是读取节点实例的函数而非值本身：因为有些节点在 setup 阶段还没
 * 解析到（要到 onMounted 才配对成功）。问题在于组合式函数自己的 onMounted 先执行、
 * 那一刻节点还是 undefined，预处理订阅就白白跳过了——拖拽依然调得到 setPosition，
 * 但 position 不再有 onChanged 回推，卡片看起来「拖不动」。
 *
 * 所以这里用 computed + watch 持续跟随 getNode：节点一旦就绪就切换订阅，
 * 迟到也不丢更新，两个节点视图的拖拽才一致。
 *
 * 这是纯 UI 逻辑（依赖 Vue 响应式 + 画布视口），故放在 renderer 侧而非 nodePlugin：
 * 拖拽拿到的指针位移是屏幕像素，除以视口缩放 viewport.scale 才等于世界位移。
 */
export interface NodePositionView {
  /** 节点的当前坐标，渲染组件把它映射成 left/top */
  readonly position: Ref<readonly [number, number]>
  /** 节点的内容区宽高 box（0 维 = 不约束），node.onChanged 时同步刷新 */
  readonly box: Ref<readonly [number, number]>
  /** 被某个接收节点悬停命中时变 true（即将被收养），NodeShell 据此给透明 */
  readonly accepted: Ref<boolean>
  /** 接到拖拽手柄的 pointerdown 上 */
  startDrag(e: PointerEvent): void
}

/** 判断 PointerEvent 的 clientX/Y 是否越出浏览器视口边界（窗口外） */
function isOutOfWindow(e: PointerEvent): boolean {
  return (
    e.clientX < 0 ||
    e.clientY < 0 ||
    e.clientX > window.innerWidth ||
    e.clientY > window.innerHeight
  )
}

export function useNodePosition(
  getNode: () => NodeLike | undefined,
  dragOutOpts?: DragOutOpts
): NodePositionView {
  const node = computed(() => getNode())
  const position = ref<readonly [number, number]>([0, 0])
  const box = ref<readonly [number, number]>([0, 0])
  const accepted = ref<boolean>(false)

  let lastNode: NodeLike | undefined
  let unsubscribe: (() => void) | undefined

  watch(
    node,
    (n) => {
      if (n === lastNode) return
      unsubscribe?.()
      lastNode = n
      unsubscribe = n?.onChanged(apply)
      apply()
    },
    { immediate: true, flush: 'sync' }
  )

  function apply(): void {
    if (lastNode) {
      position.value = lastNode.position
      box.value = lastNode.box
      accepted.value = !!lastNode.nodeDropAcceptedValue
    }
  }

  let dragging = false
  let startClientX = 0
  let startClientY = 0
  let startPos: [number, number] = [0, 0]

  /**
   * 越界确认定时器：move() 检测到越界后不立即 end()，而是等一下让用户反悔。
   * 到期才真正 end() + onDragOut(startPos)。期间 move() 又检测到回到窗口内
   * 或 pointerup 先触发，都会 clearTimeout 让 startDrag 永不触发。
   */
  let dragOutTimer: ReturnType<typeof setTimeout> | undefined

  function clearDragOutTimer(): void {
    if (dragOutTimer) {
      clearTimeout(dragOutTimer)
      dragOutTimer = undefined
    }
  }

  function move(e: PointerEvent): void {
    if (!dragging || !lastNode) return

    if (dragOutOpts?.enableDragOut) {
      const out = isOutOfWindow(e)

      if (out) {
        // 第一次越界才开定时器；已经在等了就不重复开
        if (!dragOutTimer) {
          const delay = dragOutOpts.confirmDelayMs ?? 0
          if (delay <= 0) {
            end()
            dragOutOpts.onDragOut?.(startPos)
          } else {
            dragOutTimer = setTimeout(() => {
              dragOutTimer = undefined
              end()
              dragOutOpts.onDragOut?.(startPos)
            }, delay)
          }
        }
        // 越界期间既不清监听也不 setPosition——节点停在越界那一刻的位置，
        // 让用户自己决定：是等超时触发外部拖拽，还是收回来继续内部拖拽。
        return
      }

      // 回到窗口内：如果之前有越界定时器，清掉它——用户反悔了，继续内部拖拽
      if (dragOutTimer) {
        clearDragOutTimer()
      }
    }

    const scale = viewport.scale || 1
    lastNode.setPosition(
      startPos[0] + (e.clientX - startClientX) / scale,
      startPos[1] + (e.clientY - startClientY) / scale
    )
  }

  /**
   * 结束拖拽。
   * 由 dragOut/越界路径触发或 pointerup 触发。不做投放结算——那由 App 的
   * 松手事件统一处理（读 getDraggingNode + 命中目标 + 调 onNodeDrop）。
   */
  function end(): void {
    dragging = false
    clearDragOutTimer()
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  function startDrag(e: PointerEvent): void {
    if (!lastNode) return
    e.preventDefault()
    dragging = true
    startClientX = e.clientX
    startClientY = e.clientY
    startPos = [...lastNode.position]
    draggingNode = lastNode // 记录「当前在拖拽的节点」，App 松手结算时读取
    draggingNodeStartPos = startPos // 拖拽前局部坐标，供 onNodeDrop 结算时传给目标节点
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  return { position, box, accepted, startDrag }
}
