import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// AsyncFunction 在 Electron preload 环境下没有挂成全局标识符，
// 用 (async () => {}).constructor 间接拿到它（所有 async 函数共享同一个构造器）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AsyncFunction: new (...args: string[]) => (...fnArgs: unknown[]) => unknown = (async () => {}).constructor as any

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
 * 代码节点 API：把用户写的 JS 函数体在 preload 侧执行。
 *
 * 核心设计：preload 和 renderer 共享进程内存，所以 callOutputPort 每次触发时
 * 直接调用 renderer 传进来的 onOutput 回调，让端口即时 commit。
 * 不等待函数（或其返回的 Promise）完成才收集——这样无论是同步调用、
 * Promise.then 里的调用、还是 setTimeout / setInterval 里的延迟调用，
 * 都能被 renderer 正常接收到。
 *
 * 为什么 preload 而不是主进程：
 * - preload 是 Node 环境，new Function 不受 renderer CSP 限制
 * - preload 和 renderer 共享进程内存，File 对象直接引用传递，无需 IPC 序列化
 * - 用户代码可以同时用 Node API（process、Buffer 等）和 Web API（fetch、File 等）
 *
 * 注入机制：
 * - args 参数以 { [portName]: value } 形式传入，构造函数时 key 作为参数名注入，
 *   body 里可以直接用端口名作为变量
 * - 额外注入 callOutputPort(name, value) 回调，每触发一次 → 立刻 onOutput 一次
 * - 返回值是即时状态（{ ok: true/false, error? }），不再返回 outputs 数组
 */
const codeApi = {
  run: (
    body: string,
    args: Record<string, unknown> | undefined,
    /** 每次 callOutputPort 触发时，即时回调 renderer 侧 commit 端口；值类型校验由 renderer 侧 coerce 负责 */
    onOutput: (name: string, value: unknown) => void,
    /** async 函数 reject 时回调（同步 throw 走返回值，不走这个） */
    onError?: (error: string) => void,
    /** async 函数 resolve 时回调——通知 renderer "函数体跑完了"，用于收口状态 */
    onComplete?: () => void
  ): { ok: true } | { ok: false; error: string } => {
    type SyncRunResult = { ok: true } | { ok: false; error: string }

    try {
      const names = args ? Object.keys(args) : []
      const values = args ? Object.values(args) : []

      // callOutputPort：透传给 renderer 的 onOutput，类型校验由 renderer 侧 coerce 按端口 kind 处理
      const callOutputPort = (name: string, value: unknown): void => {
        onOutput(name, value)
      }

      // 用 AsyncFunction 构造函数体，这样用户代码里可以直接写 await，
      // 而不需要自己用 async function 包裹——AsyncFunction 本身就是 async 的
      // 构造失败（语法错误包括 await 放非 async 上下文、async 写非 AsyncFunction 里都会被 catch）
      // eslint-disable-next-line no-new-func
      const fn = new AsyncFunction(...names, 'callOutputPort', `"use strict";\n${body}`) as (...args: unknown[]) => unknown
      const result = fn(...values, callOutputPort)

      // 函数本身执行时抛同步错误 → 被下面外层 catch 捕获
      // 返回 Promise：fire-and-forget，但 reject 要通知 renderer；resolve 也要通知让 renderer 收口状态
      if (result instanceof Promise) {
        result
          .then(() => {
            onComplete?.()
          })
          .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err)
            onError?.(msg)
          })
      } else {
        // 理论上 AsyncFunction 永远返回 Promise，这条分支只是防御性兜底
        onComplete?.()
      }

      return { ok: true }
    } catch (err) {
      // new Function 构造失败（语法错误等），或函数体内同步 throw
      const r: SyncRunResult = {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      }
      return r
    }
  }
}

/**
 * HTTP 节点 API：把请求参数交给主进程（Node http/https）执行并回收响应。
 * 不走渲染进程 fetch——主进程没有 CORS，也便于统一控制超时。
 *
 * 返回值分两类：
 * - 网络层错误（DNS / 连接 / 超时 / URL 格式） → { ok: false, error }
 * - 拿到响应了（不管 2xx / 4xx / 5xx） → { ok: true, status, statusText, headers, body }
 */
const httpApi = {
  request: (args: {
    url: string
    method?: string
    headers?: Record<string, string>
    body?: string
    timeout?: number
  }): Promise<
    { ok: true; status: number; statusText: string; headers: Record<string, string>; body: string }
    | { ok: false; error: string }
  > => ipcRenderer.invoke('http:request', args)
}

/**
 * WASM 资源 API：给渲染进程读取 img-compressor-wasm 的 wasm 二进制。
 *
 * 生产环境 renderer 以 file:// 加载时，包内胶水代码的 fetch 会被 Chromium 拒绝，
 * 渲染进程据此拿到字节后手动 init（返回 base64，由渲染进程解码）。
 */
const wasmApi = {
  readCompressor: (): Promise<string> => ipcRenderer.invoke('wasm:readImageCompressor')
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
  writeBuffer: (fileName: string, base64: string, overwrite?: boolean): Promise<{ fileName: string; size: number }> =>
    ipcRenderer.invoke('file:writeBuffer', { fileName, base64, overwrite }),

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

/**
 * 应用菜单里需要跟随界面语言的文案。
 *
 * 词条都在渲染进程（vue-i18n），而语言又存在渲染进程的 localStorage 里，
 * 主进程两样都拿不到，所以菜单文案由渲染进程翻译好之后推给主进程。
 */
export interface MenuLabels {
  /** 「设置」菜单项的文案（省略号由主进程按平台惯例拼接） */
  settings: string
  /** 非 macOS 平台文件菜单的标题 */
  file: string
}

/**
 * 应用菜单 API：接收主进程「系统应用菜单项被点击」的推送，以及把菜单文案推给主进程。
 * 例如 macOS 顶部菜单栏的「设置…」→ 主进程 send → 这里回调 → 渲染进程打开设置弹窗。
 * 反向：渲染进程把当前语言的菜单文案推给主进程，主进程据此重建菜单。
 */
const appMenuApi = {
  /**
   * 监听「设置」菜单项被点击。
   * 返回取消订阅函数。
   */
  onOpenSettings: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('app-menu:open-settings', handler)
    return () => ipcRenderer.removeListener('app-menu:open-settings', handler)
  },

  /** 把当前语言的菜单文案推给主进程（启动时和每次切语言都会推） */
  setLabels: (labels: MenuLabels): void => {
    ipcRenderer.send('app-menu:set-labels', labels)
  }
}

/**
 * Dialog 代理：contextIsolation 下渲染进程拿不到 Electron dialog 模块，
 * 由主进程代理弹系统文件对话框。
 */
const dialogApi = {
  /**
   * 弹出保存文件对话框，让用户选 zip 导出路径。
   * 返回用户选的绝对路径；取消则返回 null。
   */
  showSave: (args?: {
    title?: string
    defaultPath?: string
    filters?: Array<{ name: string; extensions: string[] }>
  }): Promise<string | null> =>
    ipcRenderer.invoke('dialog:showSave', args ?? {}),

  /**
   * 弹出打开文件对话框，让用户选 zip 导入文件。
   * 返回用户选的绝对路径；取消则返回 null。
   */
  showOpen: (args?: {
    title?: string
    filters?: Array<{ name: string; extensions: string[] }>
  }): Promise<string | null> =>
    ipcRenderer.invoke('dialog:showOpen', args ?? {})
}

/**
 * 数据导出/导入 API：渲染进程负责收集 localStorage 配置、剥离 API Key，
 * 主进程负责文件层面的 zip/unzip。
 */
const transferApi = {
  /**
   * 导出：把 DB + 画布文件目录 + 配置打包成 zip。
   * 渲染进程需先通过 dialogApi.showSave 拿到保存路径，并传入已剥离 API Key 的 configJson。
   */
  exportData: (savePath: string, configJson: string): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('app:exportData', { savePath, configJson }),

  /**
   * 导入：从 zip 恢复 DB + 文件目录，并返回 zip 内的 config.json 给渲染进程。
   * 调用成功后渲染进程应写入 localStorage 并提示用户重启应用。
   */
  importData: (zipPath: string): Promise<{ ok: true; configJson: string } | { ok: false; error: string }> =>
    ipcRenderer.invoke('app:importData', { zipPath })
}

if (process.contextIsolated) {
  try {
    // 主进程推送的日志 → 转发到渲染进程 Console
    // 这样 Chrome DevTools Console 和终端两边都能看到 HTTP 请求的 debug 日志
    ipcRenderer.on('main:log', (_e: Electron.IpcRendererEvent, text: string) => {
      // 用 console.info 打，避免被 Chrome Console 的 warning/error 过滤掉
      // 加一个前缀方便区分哪些是主进程推来的
      // eslint-disable-next-line no-console
      console.info(text)
    })

    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('canvasDeskDb', canvasDeskDb)
    contextBridge.exposeInMainWorld('fileApi', fileApi)
    contextBridge.exposeInMainWorld('commandApi', commandApi)
    contextBridge.exposeInMainWorld('codeApi', codeApi)
    contextBridge.exposeInMainWorld('httpApi', httpApi)
    contextBridge.exposeInMainWorld('wasmApi', wasmApi)
    contextBridge.exposeInMainWorld('appMenuApi', appMenuApi)
    contextBridge.exposeInMainWorld('dialogApi', dialogApi)
    contextBridge.exposeInMainWorld('transferApi', transferApi)
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
  // @ts-ignore (define in dts)
  window.httpApi = httpApi
  // @ts-ignore (define in dts)
  window.wasmApi = wasmApi
  // @ts-ignore (define in dts)
  window.appMenuApi = appMenuApi
  // @ts-ignore (define in dts)
  window.dialogApi = dialogApi
  // @ts-ignore (define in dts)
  window.transferApi = transferApi
}

export type ExposedApi = typeof api
export type CanvasDeskDbApi = typeof canvasDeskDb
export type FileApi = typeof fileApi
export type CommandApi = typeof commandApi
export type CodeApi = typeof codeApi
export type HttpApi = typeof httpApi
export type WasmApi = typeof wasmApi
export type AppMenuApi = typeof appMenuApi
export type DialogApi = typeof dialogApi
export type TransferApi = typeof transferApi
