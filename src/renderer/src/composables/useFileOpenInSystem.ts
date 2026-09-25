/**
 * 文件类节点共用的"双击图标 → 系统默认应用打开"逻辑。
 *
 * 主进程 shell.openPath 返回的 Promise 在成功时 resolve('')，
 * 失败时 resolve(错误信息)——主进程的 file:openInSystem handler 已经
 * 把它包装成 { ok, error } 结构，这里只需要调 IPC + 守卫 + 打 warn。
 *
 * 没有 Vue 响应式状态也没有 DOM 监听，所以不需要 cleanup。
 * 纯 async 函数，文件类节点的 render.vue 可以直接解构调用：
 * ```ts
 * const { openInSystem } = useFileOpenInSystem()
 * // 图标元素绑定：@dblclick="openInSystem(node?.fileName)"
 * ```
 */
export function useFileOpenInSystem(): {
  openInSystem: (fileName: string | undefined) => Promise<void>
} {
  async function openInSystem(fileName: string | undefined): Promise<void> {
    if (!fileName) return // 未选文件的节点没东西可开

    const result = await window.fileApi.openInSystem(fileName)
    if (!result.ok) {
      console.warn('[FileNode] 打开文件失败：', fileName, result.error)
    }
  }

  return { openInSystem }
}
