import { computed, watch, ref, type Ref } from 'vue'

/**
 * 本逻辑只依赖节点这几个可见成员。
 * 不直接用 `Node` 做参数类型：Node 基类带 private 字段，在 vue-tsc 跨编译单元解析
 * 时会被当成「结构不同」的类型，导致实测可用的节点实例也标红；
 * 换成成员结构等价的最小接口，App/节点实现测都能通过。
 */
export interface NodeLike {
  readonly position: readonly [number, number]
  setPosition(x: number, y: number): void
  onChanged(fn: () => void): () => void
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
 */
export interface NodePositionView {
  /** 节点的当前坐标，渲染组件把它映射成 left/top */
  readonly position: Ref<readonly [number, number]>
  /** 接到拖拽手柄的 pointerdown 上 */
  startDrag(e: PointerEvent): void
}

export function useNodePosition(getNode: () => NodeLike | undefined): NodePositionView {
  const node = computed(() => getNode())
  const position = ref<readonly [number, number]>([0, 0])

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
    if (lastNode) position.value = lastNode.position
  }

  let dragging = false
  let startClientX = 0
  let startClientY = 0
  let startPos: [number, number] = [0, 0]

  function move(e: PointerEvent): void {
    if (!dragging || !lastNode) return
    lastNode.setPosition(
      startPos[0] + (e.clientX - startClientX),
      startPos[1] + (e.clientY - startClientY)
    )
  }

  function end(): void {
    dragging = false
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
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  return { position, startDrag }
}