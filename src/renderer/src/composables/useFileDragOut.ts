import type { DragOutOpts } from './useNodePosition'
import { workspaceScene } from '../../../main/engine/graph/SceneRegistry'

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
 * 传进来的节点最小接口——只要能拿到 fileName + id 就够了。
 * 不用具体 FileNode，保持跟 useNodePosition 的 NodeLike 风格一致。
 */
export interface FileDragLike {
  readonly fileName: string
  readonly id: string
}

export interface FileDragOutResult {
  /** 直接展开传给 useNodePosition 的第二个参数 */
  dragOutOpts: DragOutOpts
  /** 在 onUnmounted 里调用，清理 document 级 pointerup 监听 */
  cleanup: () => void
}

export function useFileDragOut(getNode: () => FileDragLike | undefined): FileDragOutResult {
  let cleanupDragOut: (() => void) | undefined

  function handleDragOut(): void {
    const node = getNode()
    if (!node || !node.fileName) return // 没选文件的节点不许拖出
    window.fileApi.startDrag(node.fileName)

    // OS 拖拽期间窗口可能失焦，用 document 级 pointerup 兜底
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
    onDragOut: handleDragOut
  }

  return { dragOutOpts, cleanup }
}
