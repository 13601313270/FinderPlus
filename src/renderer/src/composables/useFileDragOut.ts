import type { DragOutOpts } from './useNodePosition'
import { workspaceScene } from '../../../main/engine/graph/SceneRegistry'

/**
 * 最近一次 startDrag 主进程返回的 fullPath（如果有的话）。
 *
 * 用来精确区分两类 drop：
 * - Finder 拖进来的文件 → path 是 Finder 的原位置（/Users/xxx/Desktop/4.txt），
 *   跟我们画布目录的 fullPath 不相等 → 放行创建节点
 * - 自己 startDrag 又回来松手 → Chromium 派发的 drop 的 files.path 就是这个 fullPath，
 *   完全相等 → App.vue 里跳过，避免重复节点
 *
 * 之所以不用布尔标记 + 时间窗口（之前的方案），是因为 onPointerUp 会在 drop 事件
 * 的同一帧触发——Finder 拖进来时它抢先清成 false，导致标记方案彻底失效。
 * 路径匹配没有时机问题：startDrag 返回的 fullPath 是主进程算出来的，drop 里
 * getPathForFile 拿到的也是 Chromium 原生路径，两个字符串精确对比即可。
 */
let lastStartDragPath: string | undefined

/** App.vue 的 onCanvasDrop 过滤文件时用：命中则跳过（自拖自），否则放行 */
export function isSelfDragDrop(filePath: string): boolean {
  return !!lastStartDragPath && filePath === lastStartDragPath
}

/**
 * drop 处理完（不管命中没命中）调一下清缓存。
 * 存在 startDrag → drop 到桌面（无 drop 事件）的场景下，这个缓存会残留到下次 Finder 拖拽——
 * 但 Finder 拖进来的文件路径和画布目录路径完全不同，碰巧相等的概率可以忽略。
 * 调用点是 App.vue 的 onCanvasDrop 循环结束后。
 */
export function clearSelfDragDrop(): void {
  lastStartDragPath = undefined
}

/**
 * 文件类节点共用的"拖出窗口 → OS 级文件拖拽"逻辑。
 *
 * 为什么要抽出来：handleDragOut、document 级 pointerup 监听、exists 判断、
 * removeNode 清理……这些跟节点具体类型无关，TxtFileNode / CsvFileNode /
 * 图片节点都要写一模一样的一份。抽到 composable 里，节点 render.vue 只传 getter。
 *
 * 使用方式（节点 render.vue 里）：
 * ```ts
 * import { useNodePosition } from '@renderer/composables/useNodePosition'
 * import { useFileDragOut } from '@renderer/composables/useFileDragOut'
 *
 * const fileNode = computed(() => { ... })
 * const { dragOutOpts, cleanup } = useFileDragOut(() => fileNode.value)
 * const { startDrag } = useNodePosition(() => fileNode.value, dragOutOpts)
 *
 * onUnmounted(cleanup)
 * ```
 */

/**
 * 传进来的节点最小接口——需要 fileName（判断能不能拖）、id（删节点用）、
 * setPosition（还原按下前的位置，因为越界前节点已经被 setPosition 跟着鼠标移动过了）。
 */
export interface FileDragLike {
  readonly fileName: string
  readonly id: string
  setPosition(x: number, y: number): void
}

export interface FileDragOutResult {
  /** 直接展开传给 useNodePosition 的第二个参数 */
  dragOutOpts: DragOutOpts
  /** 在 onUnmounted 里调用，清理 document 级 pointerup 监听 */
  cleanup: () => void
}

export function useFileDragOut(getNode: () => FileDragLike | undefined): FileDragOutResult {
  let cleanupDragOut: (() => void) | undefined

  /**
   * 被 useNodePosition 越界超时调用。
   * startPos 是 startDrag 时节点的原始位置（按下那一刻）——必须先还原，
   * 因为越界前节点已经跟着鼠标移动了一段距离。OS 级拖拽是文件级操作，
   * 画布上的节点应该回到按下前的位置。
   */
  async function handleDragOut(startPos: readonly [number, number]): Promise<void> {
    const node = getNode()
    if (!node || !node.fileName) return // 没选文件的节点不许拖出

    // 还原节点到按下前的位置——越界前已经被 setPosition 跟着鼠标移动过了
    node.setPosition(startPos[0], startPos[1])

    // await 主进程：拿到它实际 startDrag 用的 fullPath，存起来供 App.vue 路径匹配
    lastStartDragPath = (await window.fileApi.startDrag(node.fileName)) ?? undefined

    // OS 拖拽期间窗口可能失焦，用 document 级 pointerup 兜底清理
    function onPointerUp(): void {
      document.removeEventListener('pointerup', onPointerUp)
      cleanupDragOut = undefined

      // OS 可能还在落盘/移动文件，稍微等一下再 exists 判断
      setTimeout(async () => {
        const n = getNode()
        if (!n) return
        const stillThere = await window.fileApi.exists(n.fileName)
        if (!stillThere) {
          // 文件被移动出去了 → 删节点
          const instance = workspaceScene.getNode(n.id)
          if (instance) workspaceScene.removeNode(instance)
        }
        // 还在：用户取消了拖拽或做的是复制（源文件保留），节点不动
      }, 300)
    }

    document.addEventListener('pointerup', onPointerUp)
    cleanupDragOut = () => document.removeEventListener('pointerup', onPointerUp)
  }

  const cleanup = (): void => {
    cleanupDragOut?.()
    cleanupDragOut = undefined
  }

  const dragOutOpts: DragOutOpts = {
    enableDragOut: true,
    confirmDelayMs: 300, // 给用户 300ms 反悔窗口：滑出去又回来不会误触 OS 拖拽
    onDragOut: handleDragOut
  }

  return { dragOutOpts, cleanup }
}
