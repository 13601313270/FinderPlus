import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke('ping')
}

/**
 * 画布持久化 API：渲染进程通过它和主进程 SQLite 交互。
 * 底层实现（SqliteStorage）在主进程，这里只是薄壳代理。
 *
 * 写操作全部走 invoke（异步等主进程返回）；主进程 SqliteStorage 每次写完都 persist() 落盘。
 * loadCanvas 是启动时渲染进程读 DB 重建 Scene 用的。
 */
const canvasDeskDb = {
  saveNode: (args: {
    id: string
    type: string
    posX: number
    posY: number
    paramsJson: string
  }): Promise<boolean> => ipcRenderer.invoke('db:saveNode', args),

  deleteNode: (nodeId: string): Promise<boolean> => ipcRenderer.invoke('db:deleteNode', nodeId),

  saveEdge: (args: {
    id: string
    startNodeId: string
    startPortId: string
    endNodeId: string
    endPortId: string
  }): Promise<boolean> => ipcRenderer.invoke('db:saveEdge', args),

  deleteEdge: (edgeId: string): Promise<boolean> => ipcRenderer.invoke('db:deleteEdge', edgeId),

  saveViewport: (args: { x: number; y: number; scale: number }): Promise<boolean> =>
    ipcRenderer.invoke('db:saveViewport', args),

  loadCanvas: (): Promise<{
    nodes: Array<{ id: string; type: string; posX: number; posY: number; paramsJson: string }>
    edges: Array<{
      id: string
      startNodeId: string
      startPortId: string
      endNodeId: string
      endPortId: string
    }>
    viewport: { x: number; y: number; scale: number }
  }> => ipcRenderer.invoke('db:loadCanvas')
}

/**
 * 命令行节点 API：把 shell 命令交给主进程执行并回收输出。
 */
const commandApi = {
  run: (command: string): Promise<{ stdout: string; stderr: string; code: number }> =>
    ipcRenderer.invoke('command:run', command)
}

/**
 * 代码节点 API：把用户写的 JS 函数体交给主进程执行并回收结果。
 * 渲染进程 CSP 禁止 eval，所以执行只能在主进程做（同 commandApi 的思路）。
 */
const codeApi = {
  run: (
    body: string
  ): Promise<{ ok: true; value: number | string | boolean } | { ok: false; error: string }> =>
    ipcRenderer.invoke('code:run', body)
}

const fileApi = {
  /**
   * 从拖拽事件的 File 对象反查文件系统绝对路径。
   *
   * Electron 在 contextIsolation 下会剥离 File 对象的非标准 `.path` 属性，
   * 渲染进程直接拿不到——所以这里用 preload 特权 API webUtils.getPathForFile，
   * 它接受 File 对象（File 可以安全穿过 contextBridge，内部是原生引用），
   * 返回真实磁盘路径，然后再走主进程 copyPath IPC 复制到画布目录。
   */
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  /**
   * 把磁盘上已有的文件直接复制到画布目录（不弹窗）。
   * 配合 getPathForFile 用：renderer 拿 File → 调 getPathForFile 拿绝对路径 → 调本方法复制。
   */
  copyPath: (sourcePath: string): Promise<{ fileName: string; size: number }> =>
    ipcRenderer.invoke('file:copyPath', { sourcePath }),

  /**
   * 把内存 buffer（base64）写入画布目录。
   * 给 ImagePreviewNode 等场景用：端口拿到内存中的 File 对象，需要落盘后才能 startDrag 或生成文件节点。
   */
  writeBuffer: (fileName: string, base64: string): Promise<{ fileName: string; size: number }> =>
    ipcRenderer.invoke('file:writeBuffer', { fileName, base64 }),

  /** 读取画布目录下指定文件的文本内容（给文本类文件节点用） */
  readText: (fileName: string): Promise<string> => ipcRenderer.invoke('file:readText', fileName),

  /** 读取画布目录下指定文件的二进制内容，返回 base64 字符串（给通用文件节点用） */
  readBinary: (fileName: string): Promise<string> => ipcRenderer.invoke('file:readBinary', fileName),

  /** 删除画布目录下指定文件（文件节点清空或重新选择时清理旧副本） */
  delete: (fileName: string): Promise<void> => ipcRenderer.invoke('file:delete', fileName),

  /**
   * 启动 OS 级文件拖拽（拖出画布到桌面/系统文件夹）。
   * 返回主进程实际 startDrag 用的 fullPath（或 null）——renderer 用它区分
   * "自己 startDrag 引发的意外 drop"和"外部拖进来的文件"。
   */
  startDrag: (fileName: string): Promise<string | null> =>
    ipcRenderer.invoke('file:startDrag', { fileName }),

  /** 检查画布目录下文件是否还存在（外部拖拽结束后判断节点要不要删） */
  exists: (fileName: string): Promise<boolean> => ipcRenderer.invoke('file:exists', fileName),

  /** 把画布目录下的文件名解析成磁盘绝对路径（文件节点的「路径」输出端口用） */
  getFullPath: (fileName: string): Promise<string> =>
    ipcRenderer.invoke('file:getFullPath', fileName),

  /**
   * 用系统默认应用打开画布目录下的文件。
   * shell.openPath 的返回值（成功空串 / 失败错误信息）被主进程包装成 { ok, error } 返回。
   */
  openInSystem: (fileName: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('file:openInSystem', fileName),

  /**
   * 监听画布目录下文件变化。
   * 主进程 fs.watch 监听到变化后 debounce 300ms 推送 fileName（相对画布目录的短名，如 'a.txt'），
   * renderer 里的文件节点用这个事件触发重读 + commit 输出端口。
   *
   * 返回取消订阅函数。
   */
  onChanged: (callback: (fileName: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, fileName: string) => callback(fileName)
    ipcRenderer.on('file:changed', handler)
    return () => ipcRenderer.removeListener('file:changed', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('canvasDeskDb', canvasDeskDb)
    contextBridge.exposeInMainWorld('fileApi', fileApi)
    contextBridge.exposeInMainWorld('commandApi', commandApi)
    contextBridge.exposeInMainWorld('codeApi', codeApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.canvasDeskDb = canvasDeskDb
  // @ts-ignore (define in dts)
  window.fileApi = fileApi
  // @ts-ignore (define in dts)
  window.commandApi = commandApi
  // @ts-ignore (define in dts)
  window.codeApi = codeApi
}

export type ExposedApi = typeof api
export type CanvasDeskDbApi = typeof canvasDeskDb
export type FileApi = typeof fileApi
export type CommandApi = typeof commandApi
export type CodeApi = typeof codeApi
