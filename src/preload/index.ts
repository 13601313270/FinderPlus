import { contextBridge, ipcRenderer } from 'electron'
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

const fileApi = {
  /**
   * 打开原生文件对话框，选中的文件会被复制到"文稿/CanvasDesk/我的画布"。
   * 返回复制后的文件名和大小；用户取消则返回 null。
   */
  selectAndCopy: (args: {
    title?: string
    extensions: string[]
  }): Promise<{ fileName: string; size: number } | null> =>
    ipcRenderer.invoke('file:selectAndCopy', args),

  /** 读取画布目录下指定文件的文本内容（给文本类文件节点用） */
  readText: (fileName: string): Promise<string> => ipcRenderer.invoke('file:readText', fileName),

  /** 删除画布目录下指定文件（文件节点清空或重新选择时清理旧副本） */
  delete: (fileName: string): Promise<void> => ipcRenderer.invoke('file:delete', fileName)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('canvasDeskDb', canvasDeskDb)
    contextBridge.exposeInMainWorld('fileApi', fileApi)
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
}

export type ExposedApi = typeof api
export type CanvasDeskDbApi = typeof canvasDeskDb
export type FileApi = typeof fileApi
