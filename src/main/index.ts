import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename, extname } from 'node:path'
import { copyFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { openDatabase, closeDatabase, getDatabase, persist } from './db/database'
import { SqliteStorage } from './db/SqliteStorage'
import { ensureCanvasDir, getCanvasDir } from './paths'

let storage: SqliteStorage | null = null

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#f5f6f8',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  // —— 持久化写操作：由渲染进程 Scene 里的 IpcStorage 通过 preload 调用 ——
  ipcMain.handle('db:saveNode', (_e, args: {
    id: string
    type: string
    posX: number
    posY: number
    paramsJson: string
  }) => {
    // saveNode 在 SqliteStorage 里会直接 INSERT / UPDATE + persist
    // 但它收的是 Node 实例，不是 plain object。这里用 db.run 直接做 SQL
    const db = getDatabase()
    const now = Date.now()
    db.run(
      `INSERT INTO nodes (id, canvas_id, type, pos_x, pos_y, params, created_at, updated_at)
       VALUES (?, 'default', ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         pos_x = excluded.pos_x,
         pos_y = excluded.pos_y,
         params = excluded.params,
         updated_at = excluded.updated_at`,
      [args.id, args.type, args.posX, args.posY, args.paramsJson, now, now]
    )
    persist()
    return true
  })

  ipcMain.handle('db:deleteNode', (_e, nodeId: string) => {
    const db = getDatabase()
    db.run('DELETE FROM nodes WHERE id = ?', [nodeId])
    persist()
    return true
  })

  ipcMain.handle('db:saveEdge', (_e, args: {
    id: string
    startNodeId: string
    startPortId: string
    endNodeId: string
    endPortId: string
  }) => {
    const db = getDatabase()
    db.run(
      `INSERT INTO edges (id, canvas_id, start_node_id, start_port_id, end_node_id, end_port_id)
       VALUES (?, 'default', ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         start_node_id = excluded.start_node_id,
         start_port_id = excluded.start_port_id,
         end_node_id = excluded.end_node_id,
         end_port_id = excluded.end_port_id`,
      [args.id, args.startNodeId, args.startPortId, args.endNodeId, args.endPortId]
    )
    persist()
    return true
  })

  ipcMain.handle('db:deleteEdge', (_e, edgeId: string) => {
    const db = getDatabase()
    db.run('DELETE FROM edges WHERE id = ?', [edgeId])
    persist()
    return true
  })

  ipcMain.handle('db:saveViewport', (_e, args: { x: number; y: number; scale: number }) => {
    const db = getDatabase()
    const now = Date.now()
    db.run(
      `INSERT INTO canvases (id, name, viewport_x, viewport_y, viewport_scale, updated_at)
       VALUES ('default', '未命名', ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         viewport_x = excluded.viewport_x,
         viewport_y = excluded.viewport_y,
         viewport_scale = excluded.viewport_scale,
         updated_at = excluded.updated_at`,
      [args.x, args.y, args.scale, now]
    )
    persist()
    return true
  })

  // —— 读取：渲染进程启动时调一次，重建 Scene ——
  ipcMain.handle('db:loadCanvas', () => {
    if (!storage) throw new Error('[db] storage 尚未初始化')
    return {
      nodes: storage.loadNodes(),
      edges: storage.loadEdges(),
      viewport: storage.loadViewport()
    }
  })

  // —— 文件操作：给文件节点用 ——
  // 文件选择 + 复制到画布目录（合并成一步，避免渲染进程知道原始路径）
  ipcMain.handle('file:selectAndCopy', async (_e, args: {
    title?: string
    extensions: string[] // 如 ['.txt']
  }): Promise<{ fileName: string; size: number } | null> => {
    const result = await dialog.showOpenDialog({
      title: args.title ?? '选择文件',
      properties: ['openFile'],
      filters: [{ name: '文件', extensions: args.extensions.map((e) => e.replace(/^\./, '')) }]
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const sourcePath = result.filePaths[0]
    const canvasDir = getCanvasDir()
    ensureCanvasDir()
    // 文件名冲突处理：已存在则追加 _1, _2, …
    const targetName = resolveNonCollidingName(canvasDir, basename(sourcePath))
    const targetPath = join(canvasDir, targetName)
    copyFileSync(sourcePath, targetPath)
    const stat = readFileSync(targetPath) // 仅用于取 size
    return { fileName: targetName, size: stat.length }
  })

  // 读画布目录下的文本文件内容（给 TxtFileNode 用）
  ipcMain.handle('file:readText', (_e, fileName: string): string => {
    const targetPath = join(getCanvasDir(), fileName)
    return readFileSync(targetPath, 'utf-8')
  })

  /**
   * 把一个**已经在磁盘上存在**的文件（比如拖拽进来的，源路径由 Electron File.path 提供）
   * 复制到画布目录。和 selectAndCopy 的区别是：不弹对话框，直接按路径 copyFileSync。
   * 返回复制后的文件名（已处理重名冲突）和大小。
   */
  ipcMain.handle('file:copyPath', (_e, args: {
    sourcePath: string
  }): { fileName: string; size: number } => {
    const canvasDir = getCanvasDir()
    ensureCanvasDir()
    const targetName = resolveNonCollidingName(canvasDir, basename(args.sourcePath))
    const targetPath = join(canvasDir, targetName)
    copyFileSync(args.sourcePath, targetPath)
    const stat = readFileSync(targetPath)
    return { fileName: targetName, size: stat.length }
  })

  // 删除画布目录下的文件。用于文件节点清空、重新选择时清理旧副本
  ipcMain.handle('file:delete', (_e, fileName: string): void => {
    const targetPath = join(getCanvasDir(), fileName)
    try {
      unlinkSync(targetPath)
    } catch (err: unknown) {
      // 文件不存在或已被外部删除时静默忽略，其他情况打 warn
      if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        console.warn('[file:delete] 删除失败：', fileName, err)
      }
    }
  })

  /**
   * 启动系统级文件拖拽：渲染进程检测到用户把文件节点拖出窗口边界时调这个，
   * 主进程用 `webContents.startDrag` 让 OS 接管拖拽（拖到桌面/文件夹就是移动/复制）。
   *
   * 同步返回实际用到的 fullPath——renderer 需要这个路径来区分"自己 startDrag 引发的
   * 意外 drop"和"Finder 等外部拖进来的文件"：App.vue 的 onCanvasDrop 会对比
   * dataTransfer.files 的 path 和这个 fullPath，命中则跳过，避免创建重复节点。
   */
  ipcMain.handle('file:startDrag', async (_e, args: { fileName: string }): Promise<string | null> => {
    const fullPath = join(getCanvasDir(), args.fileName)
    if (!existsSync(fullPath)) {
      console.warn(`[file:startDrag] 文件不存在：${fullPath}`)
      return null
    }
    try {
      const icon = await app.getFileIcon(fullPath)
      _e.sender.startDrag({ file: fullPath, icon })
      return fullPath
    } catch (err) {
      console.warn('[file:startDrag] 启动拖拽失败：', err)
      return null
    }
  })

  /** 检查画布目录下文件是否还存在（用于外部拖拽结束后判断是否要删节点） */
  ipcMain.handle('file:exists', (_e, fileName: string): boolean => {
    return existsSync(join(getCanvasDir(), fileName))
  })
}

/** 目标目录下已存在同名文件时，返回加数字后缀的不冲突文件名 */
function resolveNonCollidingName(dir: string, fileName: string): string {
  if (!existsSync(join(dir, fileName))) return fileName
  const ext = extname(fileName)
  const stem = fileName.slice(0, fileName.length - ext.length)
  let i = 1
  while (true) {
    const candidate = `${stem}_${i}${ext}`
    if (!existsSync(join(dir, candidate))) return candidate
    i++
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.canvasdesk.app')

  // 画布文件目录：文稿/CanvasDesk/我的画布（不存在则递归创建）
  ensureCanvasDir()

  // 数据库：启动时打开（读磁盘 / 新建 + 建表）
  const db = await openDatabase()
  storage = new SqliteStorage(db)

  registerIpcHandlers()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
