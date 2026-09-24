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

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('canvasDeskDb', canvasDeskDb)
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
}

export type ExposedApi = typeof api
export type CanvasDeskDbApi = typeof canvasDeskDb
