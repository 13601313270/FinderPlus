import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { openDatabase, closeDatabase, getDatabase } from './db/database'
import { SqliteStorage } from './db/SqliteStorage'

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
    const { persist } = require('./db/database') as typeof import('./db/database')
    persist()
    return true
  })

  ipcMain.handle('db:deleteNode', (_e, nodeId: string) => {
    const db = getDatabase()
    db.run('DELETE FROM nodes WHERE id = ?', [nodeId])
    const { persist } = require('./db/database') as typeof import('./db/database')
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
    const { persist } = require('./db/database') as typeof import('./db/database')
    persist()
    return true
  })

  ipcMain.handle('db:deleteEdge', (_e, edgeId: string) => {
    const db = getDatabase()
    db.run('DELETE FROM edges WHERE id = ?', [edgeId])
    const { persist } = require('./db/database') as typeof import('./db/database')
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
    const { persist } = require('./db/database') as typeof import('./db/database')
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
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.canvasdesk.app')

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
