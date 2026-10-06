import { app, shell, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join, basename, extname, parse } from 'node:path'
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, mkdirSync, statSync, unlinkSync, watch, writeFileSync } from 'node:fs'
import { exec } from 'node:child_process'
import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'
import AdmZip from 'adm-zip'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { openDatabase, closeDatabase, getDatabase, persist } from './db/database'
import { SCHEMA_VERSION } from './db/schema'
import { SqliteStorage } from './db/SqliteStorage'
import { ensureCanvasDir, getCanvasDir, getCanvasRootDir, migrateLegacyRootFiles } from './paths'
import type { MenuLabels } from '../preload'

/** canvasId 安全校验：只允许字母数字下划线、中划线、中文，防路径穿越和 SQL 注入 */
const SAFE_CANVAS_ID = /^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/

const NOW = () => Date.now()

/**
 * 应用显示名固定为产品名 Finder+。
 *
 * macOS 菜单里 role 类菜单项（About / Hide / Quit）的文案由 Electron 用 app.name
 * 拼出来，而 app.name 默认取 package.json 的 name（canvas-desk），所以不处理就会
 * 显示成「About canvas-desk」——顶部菜单标题是 bundle 名（由 patch-electron-app
 * 脚本改过），两处来源不同，才会出现标题是 Finder+、菜单项是 canvas-desk 的割裂。
 *
 * 注意：userData 目录默认跟着 app.name 走，直接改名会把数据库目录一起挪到
 * ~/Library/Application Support/Finder+，已有画布数据就读不到了；这里先把默认
 * 目录记下来再钉回去，做到显示名变了、数据位置不变。
 */
const userDataDir = app.getPath('userData')
app.setName('Finder+')
app.setPath('userData', userDataDir)

let storage: SqliteStorage | null = null
let canvasWatcher: ReturnType<typeof watch> | null = null

/** 导入进行中时置 true，阻止渲染进程的自动保存 IPC 写入已关闭的 DB */
let importInProgress = false

/** 从用户输入生成合法 canvasId：小写 + 连字符，长度限制 */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 64) || `canvas-${Date.now()}`
}

// canvasId → BrowserWindow 映射，保证同一画布只开一个窗口
const canvasWindows = new Map<string, BrowserWindow>()

function createWindow(canvasId: string = 'default'): BrowserWindow {
  // 已开就 focus + show，不再新建
  const existing = canvasWindows.get(canvasId)
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore()
    existing.focus()
    existing.show()
    return existing
  }

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

  // 加载时把 canvasId 拼进 URL query。reload 不丢、dev/prod 都兼容
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = new URL(process.env['ELECTRON_RENDERER_URL'])
    url.searchParams.set('canvasId', canvasId)
    mainWindow.loadURL(url.toString())
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { canvasId }
    })
  }

  // 注册到映射表，关闭时自动清理
  canvasWindows.set(canvasId, mainWindow)
  mainWindow.on('closed', () => {
    if (canvasWindows.get(canvasId) === mainWindow) canvasWindows.delete(canvasId)
  })

  return mainWindow
}

/** 查 canvases 表行数。主进程启动时用，决定是直接开窗还是弹选择器 */
function getCanvasCount(): number {
  const db = getDatabase()
  const rows = db.exec('SELECT COUNT(*) FROM canvases')
  return rows.length ? Number(rows[0].values[0][0]) : 0
}

/** 创建画布选择器窗口（小尺寸、居中），通过 URL query 传 mode=picker 让 renderer 进入选择模式 */
function createPickerWindow(): BrowserWindow {
  const picker = new BrowserWindow({
    width: 480,
    height: 440,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#f5f6f8',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  picker.center()

  picker.on('ready-to-show', () => {
    picker.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = new URL(process.env['ELECTRON_RENDERER_URL'])
    url.searchParams.set('mode', 'picker')
    picker.loadURL(url.toString())
  } else {
    picker.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { mode: 'picker' }
    })
  }

  return picker
}

/** 根据画布数量决定是直接打开还是弹选择器 */
function createAppropriateWindow(): void {
  const count = getCanvasCount()
  if (count <= 1) {
    createWindow()
  } else {
    createPickerWindow()
  }
}

/**
 * 启动画布目录文件监听。
 * 监听整个画布根目录（文稿/CanvasDesk/我的画布）及所有子目录（每个画布一个子目录），
 * 任何文件变化（修改/新增/删除）都会 debounce 300ms 后通过
 * webContents.send('file:changed', { canvasId, fileName }) 推送给 renderer。
 *
 * fs.watch 在不同平台有差异：
 * - macOS 默认只给 change 事件（目录级），文件名要从 filename 参数拿
 * - recursive: true 在 macOS 上需要 Node 14+
 * - 某些编辑器原子保存（写临时文件 + rename）会连续触发多次，debounce 搞定
 *
 * watch 回调拿到的 fileName 是相对根目录的路径（如 'default/a.txt'、'my-flow/b.txt'），
 * debouncePushChange 会拆成 canvasId + fileName 再推送。
 */
function startCanvasWatcher(): void {
  if (canvasWatcher) return
  const root = getCanvasRootDir()
  canvasWatcher = watch(root, { encoding: 'utf-8', recursive: true }, (_event, relPath) => {
    if (!relPath) return
    // 子目录里的临时文件（.swp、~开头等）跳过，不推给 renderer
    const { base } = parse(relPath)
    if (base.startsWith('.') || base.startsWith('~') || base.endsWith('.swp') || base.endsWith('.tmp')) return
    debouncePushChange(relPath)
  })
  console.log('[main] 画布目录文件监听已启动：', root)
}

/** 防止短时间内对同一个文件重复推送（编辑器保存连发事件） */
const pendingPushes = new Map<string, NodeJS.Timeout>()
function debouncePushChange(relPath: string): void {
  const existing = pendingPushes.get(relPath)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    pendingPushes.delete(relPath)
    // 拆分相对路径：第一段是 canvasId，后面的是实际文件名
    //  'default/a.txt'  → { canvasId: 'default', fileName: 'a.txt' }
    //  'my-flow/sub/b.txt' → { canvasId: 'my-flow', fileName: 'sub/b.txt' }
    const parts = relPath.split('/')
    const canvasId = parts[0]
    const fileName = parts.slice(1).join('/')
    // 推送给所有窗口（目前只有一个，但多窗口扩展时自然生效）
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('file:changed', { canvasId, fileName })
    }
  }, 300)
  pendingPushes.set(relPath, timer)
}

function stopCanvasWatcher(): void {
  if (canvasWatcher) {
    canvasWatcher.close()
    canvasWatcher = null
    pendingPushes.forEach(t => clearTimeout(t))
    pendingPushes.clear()
    console.log('[main] 画布目录文件监听已停止')
  }
}

/**
 * 通知渲染进程打开全局设置弹窗。
 * 菜单点击发生在主进程，真正的弹窗由渲染进程的 useGlobalSettings（单例）控制，
 * 所以这里只负责 send 一个事件，渲染进程的 SettingsDialog 监听后打开。
 */
function openSettings(): void {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  win?.webContents.send('app-menu:open-settings')
}

/**
 * 应用菜单里需要跟随界面语言的文案。
 *
 * 默认给英文兜底（渲染进程还没推过来、或者推送失败时用），渲染进程就绪后会把
 * 当前语言的版本通过 'app-menu:set-labels' 推过来并触发菜单重建。
 * 之所以不在主进程直接读词条：语言存在渲染进程的 localStorage 里，主进程拿不到。
 */
let menuLabels: MenuLabels = { settings: 'Settings', file: 'File' }

/**
 * 构建系统应用菜单。
 *
 * macOS 的菜单栏固定显示在屏幕顶部（autoHideMenuBar 对它无效），
 * 这里把标准的 app 菜单补全，并在其中加入「设置」入口（快捷键 Cmd+,，macOS 惯例），
 * 点击后通过 openSettings() 打开和顶部工具栏按钮同一个弹窗。
 * 其他平台沿用标准菜单结构，同样带「设置」项。
 *
 * 注意：role 类菜单项（about / quit / editMenu / windowMenu…）的文案由系统按 OS 语言
 * 自动本地化，这里只负责自定义 label 的翻译。
 */
function buildApplicationMenu(): void {
  const isMac = process.platform === 'darwin'

  const settingsItem: Electron.MenuItemConstructorOptions = {
    // 尾部的「…」是 macOS 菜单惯例：表示点击后会先弹对话框，而不是立刻执行完
    label: `${menuLabels.settings}…`,
    accelerator: 'CmdOrCtrl+,',
    click: openSettings
  }

  const template: Electron.MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            settingsItem,
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' }
      ]
    : [
        {
          label: menuLabels.file,
          submenu: [settingsItem, { type: 'separator' }, { role: 'quit' }]
        },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' }
      ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function registerIpcHandlers(): void {
  // 渲染进程推来当前语言的菜单文案 → 重建应用菜单
  ipcMain.on('app-menu:set-labels', (_e, labels: MenuLabels) => {
    menuLabels = labels
    buildApplicationMenu()
  })

  // —— 画布管理 IPC：CRUD + 开新窗口 ——

  /** 画布 CRUD 成功后广播事件，通知所有窗口刷新 canvasList */
  function broadcastCanvasChanged(): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('canvas:changed')
    }
  }

  /** 列出所有画布：从 canvases 表读，按 updated_at 倒序。
   *  保证 default 一定存在（用户可能清空过 canvases 表但数据还在） */
  ipcMain.handle('canvas:list', () => {
    const db = getDatabase()
    // 保证 default 行存在——首次启动或用户误删时兜底
    db.run(
      `INSERT OR IGNORE INTO canvases (id, name, viewport_x, viewport_y, viewport_scale, updated_at)
       VALUES ('default', '默认画布', 0, 0, 1, ?)`,
      [NOW()]
    )
    persist()
    const rows = db.exec('SELECT id, name, updated_at FROM canvases ORDER BY updated_at DESC')
    const result = (!rows.length) ? [] : rows[0].values.map((row) => ({
      id: String(row[0]),
      name: String(row[1]),
      updatedAt: Number(row[2])
    }))
    return result
  })

  /**
   * 新建画布：INSERT canvases 表 + mkdir 子目录。
   * 返回 { id, name }。name 冲突时自动加后缀。
   */
  ipcMain.handle('canvas:create', (_e, args: { name?: string }): { id: string; name: string } => {
    const db = getDatabase()
    const rawName = args.name?.trim() || '未命名'
    let name = rawName
    let id = slugify(rawName)

    // canvasId 冲突处理：加 -2, -3 后缀
    let counter = 2
    while (db.exec('SELECT 1 FROM canvases WHERE id = ?', [id]).length > 0) {
      id = `${slugify(rawName)}-${counter}`
      name = `${rawName} (${counter})`
      counter++
    }

    if (!SAFE_CANVAS_ID.test(id)) {
      throw new Error(`画布名称不合法：${rawName}`)
    }

    const now = NOW()
    db.run(
      `INSERT INTO canvases (id, name, viewport_x, viewport_y, viewport_scale, updated_at)
       VALUES (?, ?, 0, 0, 1, ?)`,
      [id, name, now]
    )
    ensureCanvasDir(id)
    persist()
    broadcastCanvasChanged()
    return { id, name }
  })

  /** 重命名画布 */
  ipcMain.handle('canvas:rename', (_e, args: { id: string; name: string }): { ok: true } | { ok: false; error: string } => {
    if (!SAFE_CANVAS_ID.test(args.id)) return { ok: false, error: '画布 ID 不合法' }
    const db = getDatabase()
    db.run('UPDATE canvases SET name = ?, updated_at = ? WHERE id = ?', [args.name, NOW(), args.id])
    persist()
    broadcastCanvasChanged()
    return { ok: true }
  })

  /**
   * 删除画布：删 nodes + edges（ON DELETE CASCADE）+ canvases 行 + 子目录文件。
   * 不能删 'default'——至少保留一张画布。
   */
  ipcMain.handle('canvas:delete', (_e, args: { id: string }): { ok: true } | { ok: false; error: string } => {
    if (args.id === 'default') return { ok: false, error: '默认画布不能删除' }
    if (!SAFE_CANVAS_ID.test(args.id)) return { ok: false, error: '画布 ID 不合法' }
    const db = getDatabase()
    db.run('DELETE FROM canvases WHERE id = ?', [args.id])
    persist()
    // 删子目录文件
    try {
      const dir = getCanvasDir(args.id)
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
    } catch (err) {
      console.warn('[canvas:delete] 删除文件目录失败：', args.id, err)
    }
    // 如果有窗口绑定这个画布，关掉它
    for (const win of BrowserWindow.getAllWindows()) {
      try {
        const url = win.webContents.getURL()
        if (url.includes(`canvasId=${args.id}`)) win.close()
      } catch { /* 忽略关闭失败 */ }
    }
    broadcastCanvasChanged()
    return { ok: true }
  })

  /** 打开指定画布到新窗口 */
  ipcMain.handle('canvas:openNewWindow', (_e, args: { id: string }): { ok: true } | { ok: false; error: string } => {
    if (!SAFE_CANVAS_ID.test(args.id)) return { ok: false, error: '画布 ID 不合法' }
    // 确认画布存在
    const db = getDatabase()
    const rows = db.exec('SELECT 1 FROM canvases WHERE id = ?', [args.id])
    if (!rows.length) return { ok: false, error: `画布不存在：${args.id}` }
    createWindow(args.id)
    return { ok: true }
  })

  /** 在 Finder/Explorer 里打开某画布的文件目录 */
  ipcMain.handle('canvas:openFolder', (_e, args: { id: string }): { ok: false; error: string } | { ok: true } => {
    if (!SAFE_CANVAS_ID.test(args.id)) return { ok: false, error: '画布 ID 不合法' }
    const dir = getCanvasDir(args.id)
    if (!existsSync(dir)) {
      ensureCanvasDir(args.id) // 目录不存在就建一个再打开
    }
    shell.showItemInFolder(dir)
    return { ok: true }
  })

  /** 批量查画布详情：节点数、边数、文件数。给设置页【我的画布】列表展示用 */
  ipcMain.handle('canvas:details', (_e, args: { ids: string[] }): Record<string, { nodeCount: number; edgeCount: number; fileCount: number }> => {
    const db = getDatabase()
    const result: Record<string, { nodeCount: number; edgeCount: number; fileCount: number }> = {}
    for (const id of args.ids) {
      if (!SAFE_CANVAS_ID.test(id)) continue
      const nodeQ = db.exec('SELECT COUNT(*) FROM nodes WHERE canvas_id = ?', [id])
      const edgeQ = db.exec('SELECT COUNT(*) FROM edges WHERE canvas_id = ?', [id])
      const nodeCount = nodeQ.length ? Number(nodeQ[0].values[0][0]) : 0
      const edgeCount = edgeQ.length ? Number(edgeQ[0].values[0][0]) : 0
      let fileCount = 0
      try {
        const dir = getCanvasDir(id)
        if (existsSync(dir)) {
          const entries = readdirSync(dir)
          fileCount = entries.filter((name) => {
            try { return statSync(join(dir, name)).isFile() } catch { return false }
          }).length
        }
      } catch { /* 目录读不到就当 0 */ }
      result[id] = { nodeCount, edgeCount, fileCount }
    }
    return result
  })

  // —— 持久化写操作：由渲染进程 Scene 里的 IpcStorage 通过 preload 调用 ——
  ipcMain.handle('db:saveNode', (_e, args: {
    id: string
    type: string
    posX: number
    posY: number
    paramsJson: string
    canvasId?: string
  }) => {
    if (importInProgress) return false
    const canvasId = args.canvasId ?? 'default'
    const db = getDatabase()
    const now = Date.now()
    db.run(
      `INSERT INTO nodes (id, canvas_id, type, pos_x, pos_y, params, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         pos_x = excluded.pos_x,
         pos_y = excluded.pos_y,
         params = excluded.params,
         updated_at = excluded.updated_at`,
      [args.id, canvasId, args.type, args.posX, args.posY, args.paramsJson, now, now]
    )
    persist()
    return true
  })

  ipcMain.handle('db:deleteNode', (_e, args: { nodeId: string; canvasId?: string }) => {
    if (importInProgress) return false
    const nodeId = args.nodeId
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
    canvasId?: string
  }) => {
    if (importInProgress) return false
    const canvasId = args.canvasId ?? 'default'
    const db = getDatabase()
    db.run(
      `INSERT INTO edges (id, canvas_id, start_node_id, start_port_id, end_node_id, end_port_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         start_node_id = excluded.start_node_id,
         start_port_id = excluded.start_port_id,
         end_node_id = excluded.end_node_id,
         end_port_id = excluded.end_port_id`,
      [args.id, canvasId, args.startNodeId, args.startPortId, args.endNodeId, args.endPortId]
    )
    persist()
    return true
  })

  ipcMain.handle('db:deleteEdge', (_e, args: { edgeId: string; canvasId?: string }) => {
    if (importInProgress) return false
    const db = getDatabase()
    db.run('DELETE FROM edges WHERE id = ?', [args.edgeId])
    persist()
    return true
  })

  ipcMain.handle('db:saveViewport', (_e, args: { x: number; y: number; scale: number; canvasId?: string }) => {
    if (importInProgress) return false
    const canvasId = args.canvasId ?? 'default'
    const db = getDatabase()
    const now = Date.now()
    db.run(
      `INSERT INTO canvases (id, name, viewport_x, viewport_y, viewport_scale, updated_at)
       VALUES (?, '未命名', ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         viewport_x = excluded.viewport_x,
         viewport_y = excluded.viewport_y,
         viewport_scale = excluded.viewport_scale,
         updated_at = excluded.updated_at`,
      [canvasId, args.x, args.y, args.scale, now]
    )
    persist()
    return true
  })

  ipcMain.handle('db:clearCanvas', (_e, args: { canvasId?: string } = {}) => {
    if (importInProgress) return false
    const canvasId = args.canvasId ?? 'default'
    const db = getDatabase()
    db.run('DELETE FROM edges WHERE canvas_id = ?', [canvasId])
    db.run('DELETE FROM nodes WHERE canvas_id = ?', [canvasId])
    persist()
    return true
  })

  /**
   * 读取 img-compressor-wasm 的 wasm 二进制，返回 base64（给质量调整节点用）。
   *
   * 生产环境 renderer 由 loadFile 以 file:// 加载，包内胶水代码的
   * fetch(new URL('...wasm', import.meta.url)) 会被 Chromium 拒绝；
   * 这里由主进程直接读文件（Electron 的 fs 可读 asar 内路径）交给 renderer 手动 init。
   */
  ipcMain.handle('wasm:readImageCompressor', (): string => {
    const wasmPath = join(
      app.getAppPath(),
      'node_modules/img-compressor-wasm/rust-wasm/pkg/image_compressor_bg.wasm'
    )
    return readFileSync(wasmPath).toString('base64')
  })

  // —— 读取：渲染进程启动时调一次，重建 Scene ——
  ipcMain.handle('db:loadCanvas', (_e, args: { canvasId?: string } = {}) => {
    if (!storage) throw new Error('[db] storage 尚未初始化')
    return {
      nodes: storage.loadNodes(args.canvasId),
      edges: storage.loadEdges(args.canvasId),
      viewport: storage.loadViewport(args.canvasId)
    }
  })

  // —— 文件操作：给文件节点用 ——

  // 读画布目录下的文本文件内容（给 TxtFileNode 用）
  ipcMain.handle('file:readText', (_e, args: { fileName: string; canvasId?: string }): string => {
    const targetPath = join(getCanvasDir(args.canvasId), args.fileName)
    return readFileSync(targetPath, 'utf-8')
  })

  // 读画布目录下的任意文件，返回 base64 编码（给通用文件节点用）
  ipcMain.handle('file:readBinary', (_e, args: { fileName: string; canvasId?: string }): string => {
    const targetPath = join(getCanvasDir(args.canvasId), args.fileName)
    return readFileSync(targetPath, 'base64')
  })

  /**
   * 把一个**已经在磁盘上存在**的文件（比如拖拽进来的，源路径由 Electron File.path 提供）
   * 复制到画布目录。
   * 返回复制后的文件名（已处理重名冲突）和大小。
   */
  ipcMain.handle('file:copyPath', (_e, args: {
    sourcePath: string
    canvasId?: string
  }): { fileName: string; size: number } => {
    const canvasDir = getCanvasDir(args.canvasId)
    ensureCanvasDir(args.canvasId)
    const targetName = resolveNonCollidingName(canvasDir, basename(args.sourcePath))
    const targetPath = join(canvasDir, targetName)
    copyFileSync(args.sourcePath, targetPath)
    const stat = readFileSync(targetPath)
    return { fileName: targetName, size: stat.length }
  })

  /**
   * 把内存 buffer（base64）写入画布目录。
   * 给 ImagePreviewNode 等"从端口拿到 File 对象（内存中）、需要落盘"的场景用——
   * 不是所有 File 都有现成的磁盘路径可 copy，直接写 buffer 更直接。
   *
   * 内部走 resolveNonCollidingName 处理重名，返回实际写入的文件名和大小。
   */
  ipcMain.handle('file:writeBuffer', (_e, args: {
    fileName: string
    base64: string
    overwrite?: boolean
    canvasId?: string
  }): { fileName: string; size: number } => {
    const canvasDir = getCanvasDir(args.canvasId)
    ensureCanvasDir(args.canvasId)
    const targetName = args.overwrite
      ? args.fileName
      : resolveNonCollidingName(canvasDir, args.fileName)
    const targetPath = join(canvasDir, targetName)
    const buffer = Buffer.from(args.base64, 'base64')
    writeFileSync(targetPath, buffer)
    return { fileName: targetName, size: buffer.length }
  })

  // 删除画布目录下的文件。用于文件节点清空、重新选择时清理旧副本
  ipcMain.handle('file:delete', (_e, args: { fileName: string; canvasId?: string }): void => {
    const targetPath = join(getCanvasDir(args.canvasId), args.fileName)
    try {
      unlinkSync(targetPath)
    } catch (err: unknown) {
      // 文件不存在或已被外部删除时静默忽略，其他情况打 warn
      if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        console.warn('[file:delete] 删除失败：', args.fileName, err)
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
  ipcMain.handle('file:startDrag', async (_e, args: { fileName: string; canvasId?: string }): Promise<string | null> => {
    const fullPath = join(getCanvasDir(args.canvasId), args.fileName)
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

  /** 检查画布目录下文件是否还存在（外部拖拽结束后判断节点要不要删） */
  ipcMain.handle('file:exists', (_e, args: { fileName: string; canvasId?: string }): boolean => {
    return existsSync(join(getCanvasDir(args.canvasId), args.fileName))
  })

  /**
   * 把画布目录下的文件名解析成磁盘绝对路径。
   * 给文件节点的「路径」输出端口用——渲染进程拿不到真实磁盘路径
   * （Electron 在 contextIsolation 下会剥离 File.path），只能回主进程拼。
   */
  ipcMain.handle('file:getFullPath', (_e, args: { fileName: string; canvasId?: string }): string => {
    return join(getCanvasDir(args.canvasId), args.fileName)
  })

  /**
   * 用系统默认应用打开画布目录下的文件。
   * 双击文件节点图标时调用——用户想在 Finder 关联的 App 里编辑/预览文件。
   *
   * 返回 { ok } 表示成功；{ ok: false, error } 带失败原因。
   * shell.openPath 在目标文件不存在或关联应用被卸载时会返回非空错误信息。
   */
  ipcMain.handle('file:openInSystem', async (_e, args: { fileName: string; canvasId?: string }): Promise<{ ok: boolean; error?: string }> => {
    const fullPath = join(getCanvasDir(args.canvasId), args.fileName)
    if (!existsSync(fullPath)) {
      return { ok: false, error: '文件不存在' }
    }
    try {
      const err = await shell.openPath(fullPath)
      if (err) {
        return { ok: false, error: err }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  /**
   * 执行一条 shell 命令，回传 stdout / stderr / 退出码（给命令行节点用）。
   *
   * 用 exec（走系统默认 shell）而非 spawn：命令是用户自己写的整串（含管道、重定向），
   * 交给 shell 解析更符合「命令行」直觉。工作目录定在用户主目录。
   * 超时 / 输出上限兜底，避免失控命令把主进程拖垮。
   * 命令退出码非 0 时 exec 会回调 error，其 code 即退出码；spawn 级失败（如被信号杀掉）code 不是数字，统一按 1 处理。
   */
  ipcMain.handle('command:run', async (_e, command: string): Promise<{
    stdout: string
    stderr: string
    code: number
  }> => {
    return await new Promise((resolve) => {
      exec(
        command,
        { cwd: app.getPath('home'), timeout: 60_000, maxBuffer: 1024 * 1024, windowsHide: true },
        (err, stdout, stderr) => {
          let code = 0
          let errOut = stderr ?? ''
          if (err) {
            const rawCode = (err as NodeJS.ErrnoException & { code?: number | string }).code
            code = typeof rawCode === 'number' ? rawCode : 1
            // spawn 级失败（命令不存在等）stderr 可能为空，用 error.message 兜底
            if (!errOut && err.message) errOut = err.message
          }
          resolve({ stdout: stdout ?? '', stderr: errOut, code })
        }
      )
    })
  })

  // —— 表节点：动态建表 + 行 CRUD ——

  /** 合法列名正则：字母/下划线开头，后跟字母/数字/下划线 */
  const COLUMN_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

  /** 第一期支持的三种列类型 → SQLite 类型映射 */
  const COLUMN_TYPE_MAP: Record<string, string> = {
    number: 'REAL',
    string: 'TEXT',
    boolean: 'INTEGER'
  }

  /** 把节点 id 清洗成合法的 SQLite 表名 */
  function sanitizeTableName(nodeId: string): string {
    // 把非字母数字下划线的字符替换成下划线
    const safe = nodeId.replace(/[^a-zA-Z0-9_]/g, '_')
    return `tbl_${safe}`
  }

  /** 校验列名只含字母数字下划线（SQL 列名安全） */
  function sanitizeColumnName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_')
  }

  /** 校验列定义，返回 { ok, error?, columns } */
  function validateColumns(cols: Array<{ name: string; type: string }>):
    { ok: true; columns: Array<{ name: string; sqlType: string }> }
    | { ok: false; error: string } {
    if (!Array.isArray(cols)) return { ok: false, error: 'columns 必须是数组' }
    if (cols.length === 0) return { ok: false, error: '至少需要一个自定义列' }

    const seen = new Set<string>()
    const validated: Array<{ name: string; sqlType: string }> = []

    for (const c of cols) {
      if (typeof c.name !== 'string' || !COLUMN_NAME_RE.test(c.name)) {
        return { ok: false, error: `列名 "${c.name}" 不合法：只能以字母或下划线开头，后跟字母/数字/下划线` }
      }
      if (seen.has(c.name)) {
        return { ok: false, error: `列名 "${c.name}" 重复` }
      }
      seen.add(c.name)

      const sqlType = COLUMN_TYPE_MAP[c.type]
      if (!sqlType) {
        return { ok: false, error: `不支持的列类型 "${c.type}"，只支持 number / string / boolean` }
      }
      validated.push({ name: c.name, sqlType })
    }

    return { ok: true, columns: validated }
  }

  /**
   * 确保物理表存在（CREATE TABLE IF NOT EXISTS）。
   * 新建节点和从备份恢复都会走这个——IF NOT EXISTS 天然幂等。
   */
  ipcMain.handle('table:ensure', (_e, args: {
    nodeId: string
    columns: Array<{ name: string; type: string }>
  }): { ok: true; tableName: string } | { ok: false; error: string } => {
    if (importInProgress) return { ok: false, error: '导入中，暂不操作' }

    const tableName = sanitizeTableName(args.nodeId)
    const v = validateColumns(args.columns)
    if (!v.ok) return { ok: false, error: v.error }

    const colDefs = v.columns.map((c) => `  ${c.name} ${c.sqlType}`).join(',\n')
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n${colDefs}\n)`

    try {
      const db = getDatabase()
      db.run(sql)
      persist()
      return { ok: true, tableName }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /** 删除物理表（节点被删时调用） */
  ipcMain.handle('table:drop', (_e, args: {
    nodeId: string
  }): { ok: true } | { ok: false; error: string } => {
    if (importInProgress) return { ok: false, error: '导入中，暂不操作' }

    const tableName = sanitizeTableName(args.nodeId)
    try {
      const db = getDatabase()
      db.run(`DROP TABLE IF EXISTS ${tableName}`)
      persist()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /** 分页查询：返回 rows + total。pageSize 默认 50 */
  ipcMain.handle('table:queryPage', (_e, args: {
    nodeId: string
    columns: Array<{ name: string; type: string }>
    page: number
    pageSize?: number
    /** 搜索条件：多个条件 AND 组合。值走参数化绑定防注入 */
    where?: Array<{ column: string; op: '=' | 'LIKE'; value: unknown }>
    /** 排序：列名必须在 columns 白名单里，order 限定 'ASC' | 'DESC' */
    sort?: { column: string; order: 'ASC' | 'DESC' } | null
  }): { ok: true; rows: Array<Record<string, unknown>>; total: number } | { ok: false; error: string } => {
    const tableName = sanitizeTableName(args.nodeId)
    const v = validateColumns(args.columns)
    if (!v.ok) return { ok: false, error: v.error }

    const page = Math.max(1, args.page ?? 1)
    const pageSize = Math.min(200, Math.max(1, args.pageSize ?? 50))
    const offset = (page - 1) * pageSize

    // —— 构造 WHERE 子句（参数化，防 SQL 注入）——
    const whereClauses: string[] = []
    const whereParams: unknown[] = []
    if (args.where && args.where.length > 0) {
      for (const cond of args.where) {
        // 列名必须在 columns 白名单里，op 也在限定集合里
        const colDef = args.columns.find((c) => c.name === cond.column)
        if (!colDef) continue
        const op = cond.op === 'LIKE' ? 'LIKE' : '='
        whereClauses.push(`${sanitizeColumnName(cond.column)} ${op} ?`)
        // LIKE 需要前后加 %
        whereParams.push(op === 'LIKE' ? `%${String(cond.value ?? '')}%` : cond.value)
      }
    }
    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    // —— 排序（列名白名单校验 + sanitize，order 限定枚举）——
    let orderSQL = 'ORDER BY id'
    if (args.sort && typeof args.sort === 'object') {
      const sortColDef = args.columns.find((c) => c.name === args.sort!.column)
      if (sortColDef && (args.sort.order === 'ASC' || args.sort.order === 'DESC')) {
        orderSQL = `ORDER BY ${sanitizeColumnName(args.sort.column)} ${args.sort.order}, id`
      }
    }

    try {
      const db = getDatabase()

      // 总数
      const totalSql = `SELECT COUNT(*) as cnt FROM ${tableName} ${whereSQL}`
      const totalRows = db.exec(totalSql, whereParams)
      const total = totalRows.length > 0 && totalRows[0].values.length > 0
        ? Number(totalRows[0].values[0][0])
        : 0

      // 分页数据
      const colNames = ['id', ...v.columns.map((c) => c.name)]
      const sql = `SELECT ${colNames.join(', ')} FROM ${tableName} ${whereSQL} ${orderSQL} LIMIT ${pageSize} OFFSET ${offset}`
      const result = db.exec(sql, whereParams)

      const rows: Array<Record<string, unknown>> = []
      if (result.length > 0 && result[0].values.length > 0) {
        for (const row of result[0].values) {
          const obj: Record<string, unknown> = {}
          colNames.forEach((name, i) => {
            let val: unknown = row[i]
            // boolean 列：SQLite 存 INTEGER (0/1)，转成 true/false
            const colDef = v.columns.find((c) => c.name === name)
            if (colDef && colDef.sqlType === 'INTEGER' && name !== 'id') {
              val = val === 1
            }
            obj[name] = val
          })
          rows.push(obj)
        }
      }

      return { ok: true, rows, total }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /**
   * 执行原始 SQL 查询（只允许 SELECT），返回 rows 数组。
   * SQL 中的 `{table}` 占位符会被替换成该节点的物理表名。
   * 供 TableNode 动态查询端口使用——上游 StringValue 送 SQL 进来，
   * TableNode 执行后把 rows 包装成 JsonValue commit 给下游。
   */
  ipcMain.handle('table:executeRawSql', (_e, args: {
    nodeId: string
    sql: string
  }): { ok: true; rows: Array<Record<string, unknown>> } | { ok: false; error: string } => {
    if (importInProgress) return { ok: false, error: '导入中，暂不操作' }

    const sql = args.sql?.trim()
    if (!sql) return { ok: false, error: 'SQL 不能为空' }

    // —— SELECT-only 守卫：正则匹配开头（允许前置空白/注释） ——
    const trimmed = sql.replace(/^[\s;]*|[\s;]*$/g, '')
    const selectOnly = /^SELECT\b/i.test(trimmed)
    if (!selectOnly) {
      return { ok: false, error: '只允许 SELECT 查询，禁止修改类语句' }
    }

    // —— 替换 {table} 占位符 ——
    const tableName = sanitizeTableName(args.nodeId)
    const finalSql = trimmed.replace(/\{table\}/g, tableName)

    try {
      const db = getDatabase()
      const result = db.exec(finalSql)

      const rows: Array<Record<string, unknown>> = []
      if (result.length > 0 && result[0].values.length > 0) {
        const cols = result[0].columns
        for (const row of result[0].values) {
          const obj: Record<string, unknown> = {}
          cols.forEach((name: string, i: number) => {
            obj[name] = row[i]
          })
          rows.push(obj)
        }
      }

      return { ok: true, rows }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /** 插入一行。values 是 { colName: value }，会按 columns 定义过滤 + 类型转换 */
  ipcMain.handle('table:insertRow', (_e, args: {
    nodeId: string
    columns: Array<{ name: string; type: string }>
    values: Record<string, unknown>
  }): { ok: true; newId: number } | { ok: false; error: string } => {
    if (importInProgress) return { ok: false, error: '导入中，暂不操作' }

    const tableName = sanitizeTableName(args.nodeId)
    const v = validateColumns(args.columns)
    if (!v.ok) return { ok: false, error: v.error }

    try {
      const db = getDatabase()
      const cols: string[] = []
      const placeholders: string[] = []
      const params: unknown[] = []

      for (const c of v.columns) {
        cols.push(c.name)
        placeholders.push('?')
        let raw = args.values?.[c.name]

        // 类型转换
        if (c.sqlType === 'INTEGER') {
          // boolean
          raw = raw ? 1 : 0
        } else if (c.sqlType === 'REAL') {
          // number — 转数字，NaN 兜底 0
          const n = Number(raw)
          raw = Number.isFinite(n) ? n : 0
        } else if (c.sqlType === 'TEXT') {
          // string — 强制转字符串，null/undefined 转空串
          raw = raw == null ? '' : String(raw)
        }

        params.push(raw)
      }

      const sql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`
      db.run(sql, params)

      // 取最后插入的 id — sql.js 没有 lastInsertRowid，用 SELECT last_insert_rowid()
      const idResult = db.exec('SELECT last_insert_rowid() as id')
      const newId = idResult.length > 0 && idResult[0].values.length > 0
        ? Number(idResult[0].values[0][0])
        : 0

      persist()
      return { ok: true, newId }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /** 更新一行。rowId 指定 id，values 是要更新的字段 */
  ipcMain.handle('table:updateRow', (_e, args: {
    nodeId: string
    columns: Array<{ name: string; type: string }>
    rowId: number
    values: Record<string, unknown>
  }): { ok: true } | { ok: false; error: string } => {
    if (importInProgress) return { ok: false, error: '导入中，暂不操作' }

    const tableName = sanitizeTableName(args.nodeId)
    const v = validateColumns(args.columns)
    if (!v.ok) return { ok: false, error: v.error }

    try {
      const db = getDatabase()
      const setClauses: string[] = []
      const params: unknown[] = []

      for (const c of v.columns) {
        if (!(c.name in args.values)) continue
        setClauses.push(`${c.name} = ?`)
        let raw = args.values[c.name]

        if (c.sqlType === 'INTEGER') {
          raw = raw ? 1 : 0
        } else if (c.sqlType === 'REAL') {
          const n = Number(raw)
          raw = Number.isFinite(n) ? n : 0
        } else if (c.sqlType === 'TEXT') {
          raw = raw == null ? '' : String(raw)
        }

        params.push(raw)
      }

      if (setClauses.length === 0) {
        return { ok: false, error: '没有可更新的字段' }
      }

      params.push(args.rowId)
      const sql = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = ?`
      db.run(sql, params)
      persist()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /** 删除一行 */
  ipcMain.handle('table:deleteRow', (_e, args: {
    nodeId: string
    rowId: number
  }): { ok: true } | { ok: false; error: string } => {
    if (importInProgress) return { ok: false, error: '导入中，暂不操作' }

    const tableName = sanitizeTableName(args.nodeId)
    try {
      const db = getDatabase()
      db.run(`DELETE FROM ${tableName} WHERE id = ?`, [args.rowId])
      persist()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /** 给物理表加一列（ALTER TABLE ADD COLUMN）。用于用户在 UI 里新增列 */
  ipcMain.handle('table:addColumn', (_e, args: {
    nodeId: string
    column: { name: string; type: string }
  }): { ok: true } | { ok: false; error: string } => {
    if (importInProgress) return { ok: false, error: '导入中，暂不操作' }

    const tableName = sanitizeTableName(args.nodeId)
    const col = args.column

    // 校验列名和类型（复用已有的校验逻辑）
    if (!COLUMN_NAME_RE.test(col.name)) {
      return { ok: false, error: `列名 "${col.name}" 不合法` }
    }
    const sqlType = COLUMN_TYPE_MAP[col.type]
    if (!sqlType) {
      return { ok: false, error: `不支持的列类型 "${col.type}"` }
    }

    // DEFAULT 值 — SQLite ALTER TABLE ADD COLUMN 要求新列有默认值
    const defaults: Record<string, string> = { REAL: '0', TEXT: "''", INTEGER: '0' }
    const defaultVal = defaults[sqlType] ?? "''"

    try {
      const db = getDatabase()
      const sql = `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${sqlType} DEFAULT ${defaultVal}`
      db.run(sql)
      persist()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /** 从物理表删一列（ALTER TABLE DROP COLUMN）。SQLite 3.35.0+ 支持 */
  ipcMain.handle('table:removeColumn', (_e, args: {
    nodeId: string
    columnName: string
  }): { ok: true } | { ok: false; error: string } => {
    if (importInProgress) return { ok: false, error: '导入中，暂不操作' }

    const tableName = sanitizeTableName(args.nodeId)

    if (!COLUMN_NAME_RE.test(args.columnName)) {
      return { ok: false, error: `列名 "${args.columnName}" 不合法` }
    }

    try {
      const db = getDatabase()
      db.run(`ALTER TABLE ${tableName} DROP COLUMN ${args.columnName}`)
      persist()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // code:run handler 已移除——代码节点的执行现在在 preload 侧完成，
  // preload 是 Node 环境 + 与 renderer 共享进程内存，new Function 可用且 File 对象无需 IPC 序列化。

  /**
   * 发送 HTTP / HTTPS 请求（给 HTTP 节点用）。
   *
   * 用 Node 原生 http / https，不走渲染进程 fetch，这样：
   * - 没有 CORS 限制（主进程不受同源策略约束）
   * - 自签证书、内网服务都能正常访问（rejectUnauthorized 默认 true，
   *   用户真要访问自签证书可以在 headers 里带一个标记……先不做，保持默认安全）
   * - 统一的超时兜底（默认 15s，最大 60s）
   *
   * 不跟随重定向（301/302 等）——让用户自己看到 3xx 状态码后决定怎么处理，
   * 避免自动跳转导致的静默失败。
   *
   * 返回值分两类：网络层/DNS/连接/超时等错误 → { ok: false, error }；
   * 拿到响应了（哪怕是 4xx/5xx）都算成功，status / statusText / headers / body 原样回传。
   */
  ipcMain.handle('http:request', async (e, args: {
    url: string
    method?: string
    headers?: Record<string, string>
    body?: string
    timeout?: number
  }): Promise<
    { ok: true; status: number; statusText: string; headers: Record<string, string>; body: string }
    | { ok: false; error: string }
  > => {
    const { url, method, headers, body, timeout } = args
    const ms = Math.min(60_000, Math.max(1000, timeout ?? 15_000))

    const forward = (...lines: string[]): void => {
      const text = lines.filter(Boolean).join('\n')
      try { e.sender.send('main:log', text) } catch { /* noop */ }
    }

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      forward(`[http] ✗ INVALID URL  ${url}`)
      return { ok: false, error: `URL 格式错误：${url}` }
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      forward(`[http] ✗ INVALID PROTOCOL  ${parsed.protocol}  url=${url}`)
      return { ok: false, error: `只支持 http: 或 https: 协议，当前是 ${parsed.protocol}` }
    }

    // —— headers 处理 ——
    // 只跳过 hop-by-hop / 自动管理的头（避免 Node 自己设置时冲突）。
    // 非 ASCII / CRLF 等非法字符**不清洗**——让 Node 直接抛 ERR_INVALID_CHAR，
    // 把具体哪个 header 坏了的错误传回 renderer，UI 显示红警告，用户自己决定要不要先 encode。
    const HOP_BY_HOP = new Set([
      'connection', 'host', 'content-length', 'accept-encoding',
      'keep-alive', 'proxy-authorization', 'te', 'trailer',
      'transfer-encoding', 'upgrade'
    ])
    const filteredHeaders: Record<string, string> = {}
    const skipNotes: string[] = []
    if (headers) {
      for (const [rawKey, rawVal] of Object.entries(headers)) {
        const key = String(rawKey)
        if (HOP_BY_HOP.has(key.toLowerCase())) {
          skipNotes.push(`跳过自动管理头 "${key}"`)
          continue
        }
        filteredHeaders[key] = String(rawVal)
      }
    }

    if (skipNotes.length) {
      forward(`[http]   ℹ ${skipNotes.join('；')}`)
    }

    const lib = parsed.protocol === 'https:' ? https : http
    const verb = (method ?? 'GET').toUpperCase()
    const bodyData = verb === 'GET' || verb === 'HEAD' ? undefined : (body ?? '')
    const t0 = Date.now()

    const reqHeadersStr = Object.keys(filteredHeaders).length > 0
      ? JSON.stringify(filteredHeaders)
      : '(none)'
    const reqBodyPreview = bodyData
      ? truncate(bodyData, 500)
      : '(none)'

    forward(
      `[http] → ${verb} ${url}  timeout=${ms}ms`,
      `[http]   req headers: ${reqHeadersStr}`,
      bodyData ? `[http]   req body (${bodyData.length}B): ${reqBodyPreview}` : ''
    )

    return await new Promise((resolve) => {
      const req = lib.request(
        {
          method: verb,
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          path: parsed.pathname + parsed.search,
          headers: {
            ...(bodyData !== undefined
              ? { 'Content-Length': Buffer.byteLength(bodyData) }
              : {}),
            ...filteredHeaders
          },
          timeout: ms
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk) => chunks.push(chunk))
          res.on('end', () => {
            const buf = Buffer.concat(chunks)
            // Node 的 res.headers 值可能是 string | string[]，拍平成逗号分隔
            const flatHeaders: Record<string, string> = {}
            for (const [k, v] of Object.entries(res.headers)) {
              if (v === undefined) continue
              flatHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v)
            }
            const dt = Date.now() - t0
            const bodyLen = buf.length
            const resBodyStr = buf.toString('utf-8')
            const resHeadersStr = JSON.stringify(flatHeaders)
            const resBodyPreview = bodyLen > 0 ? truncate(resBodyStr, 500) : '(empty)'
            forward(
              `[http] ← ${res.statusCode} ${res.statusMessage ?? ''}  ${dt}ms  body=${bodyLen}B`,
              `[http]   res headers: ${resHeadersStr}`,
              bodyLen > 0 ? `[http]   res body (${bodyLen}B): ${resBodyPreview}` : ''
            )
            resolve({
              ok: true,
              status: res.statusCode ?? 0,
              statusText: res.statusMessage ?? '',
              headers: flatHeaders,
              body: resBodyStr
            })
          })
        }
      )

      req.on('timeout', () => {
        req.destroy(new Error(`请求超时（${ms}ms）`))
      })

      req.on('error', (err) => {
        const dt = Date.now() - t0
        forward(`[http] ✗ ERROR  ${err.message}  after ${dt}ms`)
        resolve({ ok: false, error: err.message })
      })

      if (bodyData !== undefined) req.write(bodyData)
      req.end()
    })
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

/**
 * 字符串截断工具：超过 max 字符时截掉尾部加 "…(+N chars)"。
 * 只给日志用——header/body 可能几百 KB，原样打出来终端受不了。
 */
function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return `${str.slice(0, max)}…(+${str.length - max} chars)`
}

// —— 数据导出 / 导入 ——

/** 导出 zip 内的目录结构常量 */
const EXPORT_DB_NAME = 'canvasdesk.db'
const EXPORT_FILES_DIR = 'files'
const EXPORT_CONFIG_NAME = 'config.json'
const EXPORT_META_NAME = 'meta.json'

/**
 * 把整个画布 + DB + 文件目录打包成 zip。
 *
 * 导出包结构：
 *   canvasdesk.db          —— 数据库文件（完整节点/边/视口）
 *   files/                 —— 画布目录下的所有文件（原样复制）
 *   config.json            —— 渲染进程 localStorage 配置（已剥离 API Key）
 *   meta.json              —— 版本号 + 导出时间戳
 *
 * 调用时机：用户在 SettingsDialog 点「导出」，渲染进程先弹 save dialog 选路径、
 * 再把剥离后的 configJson 连同 savePath 一起传过来。主进程负责文件层面的打包。
 */
ipcMain.handle('app:exportData', (_e, args: {
  savePath: string
  configJson: string
}): { ok: true } | { ok: false; error: string } => {
  try {
    // 1. 确保 DB 最新状态落盘
    persist()

    // 2. 收集路径
    const userDataDir = app.getPath('userData')
    const dbFilePath = join(userDataDir, 'canvasdesk.db')
    const canvasDir = getCanvasDir()

    // 3. 构建 zip
    const zip = new AdmZip()

    // 3a. DB 文件（必须存在）
    if (!existsSync(dbFilePath)) {
      return { ok: false, error: '数据库文件不存在，无法导出' }
    }
    zip.addLocalFile(dbFilePath, '', EXPORT_DB_NAME)

    // 3b. 画布目录（可能为空——用户还没放任何文件节点）
    if (existsSync(canvasDir)) {
      zip.addLocalFolder(canvasDir, EXPORT_FILES_DIR)
    }

    // 3c. config.json（渲染进程已剥离 API Key）
    zip.addFile(EXPORT_CONFIG_NAME, Buffer.from(args.configJson, 'utf-8'))

    // 3d. meta.json
    const meta = {
      appVersion: app.getVersion(),
      exportedAt: new Date().toISOString(),
      schemaVersion: 1
    }
    zip.addFile(EXPORT_META_NAME, Buffer.from(JSON.stringify(meta, null, 2), 'utf-8'))

    // 4. 写磁盘
    zip.writeZip(args.savePath)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

/**
 * 从 zip 导入数据，覆盖 DB + 文件目录，并返回 config.json 给渲染进程写入 localStorage。
 *
 * 关键顺序（不能乱）：
 *   1. 解压 zip → 校验 meta.json schemaVersion → 校验必要文件
 *   2. 备份当前 DB + 画布目录到临时 backupDir（安全网）
 *   3. 停 watcher → close DB
 *   4. 覆盖 DB → 覆盖画布目录 → reopen DB → 重启 watcher
 *   5. 任何步骤失败 → 从 backupDir 恢复旧数据
 *   6. 成功 → 返回 configJson 给渲染进程 + 通知渲染进程 reload
 */
ipcMain.handle('app:importData', async (_e, args: {
  zipPath: string
}): Promise<{ ok: true; configJson: string } | { ok: false; error: string }> => {
  const tmpDir = join(app.getPath('temp'), `canvasdesk-import-${Date.now()}`)
  let backupDir: string | null = null
  importInProgress = true
  try {
    // —— 阶段一：解压 + 校验 ——
    if (!existsSync(args.zipPath)) {
      return { ok: false, error: '导出文件不存在' }
    }
    const zip = new AdmZip(args.zipPath)
    mkdirSync(tmpDir, { recursive: true })
    zip.extractAllTo(tmpDir, true)

    // 校验必要文件
    const extractedDb = join(tmpDir, EXPORT_DB_NAME)
    const extractedConfig = join(tmpDir, EXPORT_CONFIG_NAME)
    if (!existsSync(extractedDb)) {
      rmSync(tmpDir, { recursive: true, force: true })
      return { ok: false, error: '导出文件损坏：缺少 canvasdesk.db' }
    }
    if (!existsSync(extractedConfig)) {
      rmSync(tmpDir, { recursive: true, force: true })
      return { ok: false, error: '导出文件损坏：缺少 config.json' }
    }

    // schemaVersion 校验（只警告不拒绝，兼容旧版本备份没有 meta.json 的情况）
    const metaPath = join(tmpDir, EXPORT_META_NAME)
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as { schemaVersion?: number }
        if (typeof meta.schemaVersion === 'number' && meta.schemaVersion > SCHEMA_VERSION) {
          rmSync(tmpDir, { recursive: true, force: true })
          return {
            ok: false,
            error: `备份文件 schema 版本 (${meta.schemaVersion}) 高于当前应用支持的版本 (${SCHEMA_VERSION})，请先升级应用。`
          }
        }
      } catch {
        // meta.json 解析失败——忽略，继续导入
      }
    }

    // —— 阶段二：备份旧数据 ——
    const userDataDir = app.getPath('userData')
    const dbFilePath = join(userDataDir, 'canvasdesk.db')
    const canvasDir = getCanvasDir()

    backupDir = join(app.getPath('temp'), `canvasdesk-backup-${Date.now()}`)
    mkdirSync(backupDir, { recursive: true })
    if (existsSync(dbFilePath)) {
      copyFileSync(dbFilePath, join(backupDir, 'canvasdesk.db'))
    }
    if (existsSync(canvasDir)) {
      const canvasBackup = join(backupDir, 'canvas')
      mkdirSync(canvasBackup, { recursive: true })
      copyDirRecursive(canvasDir, canvasBackup)
    }

    // —— 阶段三：停 watcher + close DB ——
    stopCanvasWatcher()
    closeDatabase()

    // —— 阶段四：覆盖 + 重新打开 ——
    try {
      // 覆盖 DB
      copyFileSync(extractedDb, dbFilePath)

      // 覆盖画布目录
      if (existsSync(canvasDir)) {
        rmSync(canvasDir, { recursive: true, force: true })
      }
      ensureCanvasDir()
      const extractedFilesDir = join(tmpDir, EXPORT_FILES_DIR)
      if (existsSync(extractedFilesDir)) {
        copyDirRecursive(extractedFilesDir, canvasDir)
      }

      // 重新 open DB（await 确保完成）
      const db = await openDatabase()
      storage = new SqliteStorage(db)

      // 重启 watcher
      startCanvasWatcher()
    } catch (innerErr) {
      // 阶段四任何步骤失败 → 恢复旧数据
      console.error('[import] restore failed, rolling back:', innerErr)
      try {
        // 先确保 DB 已 close
        closeDatabase()
        if (backupDir) {
          // 恢复 DB
          const backupDb = join(backupDir, 'canvasdesk.db')
          if (existsSync(backupDb)) {
            copyFileSync(backupDb, dbFilePath)
          }
          // 恢复画布目录
          const backupCanvas = join(backupDir, 'canvas')
          if (existsSync(backupCanvas)) {
            if (existsSync(canvasDir)) {
              rmSync(canvasDir, { recursive: true, force: true })
            }
            copyDirRecursive(backupCanvas, canvasDir)
          }
        }
        // 重新打开 DB
        const db = await openDatabase()
        storage = new SqliteStorage(db)
        startCanvasWatcher()
      } catch (rollbackErr) {
        console.error('[import] rollback also failed:', rollbackErr)
      }
      rmSync(tmpDir, { recursive: true, force: true })
      if (backupDir) rmSync(backupDir, { recursive: true, force: true })
      return {
        ok: false,
        error: `导入失败：${innerErr instanceof Error ? innerErr.message : String(innerErr)}（旧数据已恢复）`
      }
    }

    // —— 阶段五：清理临时文件 + 返回 ——
    // 注意：必须在 rmSync(tmpDir) 之前读取 extractedConfig，否则 tmpDir 被删后 ENOENT
    const configJson = readFileSync(extractedConfig, 'utf-8')
    rmSync(tmpDir, { recursive: true, force: true })
    if (backupDir) rmSync(backupDir, { recursive: true, force: true })

    return { ok: true, configJson }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    importInProgress = false
  }
})

/** 递归复制目录（用 Node fs，保持平台兼容） */
function copyDirRecursive(src: string, dest: string): void {
  const entries = readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true })
      copyDirRecursive(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

// —— Dialog 代理（contextIsolation 下渲染进程拿不到 dialog 模块） ——

/** 渲染进程请求弹出 Save File dialog，返回用户选的路径（取消则返回 null） */
ipcMain.handle('dialog:showSave', async (_e, args: {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}): Promise<string | null> => {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showSaveDialog(win!, {
    title: args.title ?? '导出数据',
    defaultPath: args.defaultPath,
    filters: args.filters
  })
  return result.canceled ? null : result.filePath
})

/** 渲染进程请求弹出 Open File dialog（选 zip），返回用户选的路径（取消则返回 null） */
ipcMain.handle('dialog:showOpen', async (_e, args: {
  title?: string
  filters?: Array<{ name: string; extensions: string[] }>
}): Promise<string | null> => {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showOpenDialog(win!, {
    title: args.title ?? '导入数据',
    properties: ['openFile'],
    filters: args.filters
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.canvasdesk.app')

  // 画布文件目录：文稿/CanvasDesk/我的画布/{canvasId}/
  // 先做旧版根目录文件迁移（v1 → v2），再确保 default 子目录存在
  migrateLegacyRootFiles()
  ensureCanvasDir('default')

  // 数据库：启动时打开（读磁盘 / 新建 + 建表）
  const db = await openDatabase()
  storage = new SqliteStorage(db)

  registerIpcHandlers()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createAppropriateWindow()
  startCanvasWatcher()
  // 构建系统应用菜单（含「设置」入口，macOS 显示在屏幕顶部菜单栏）
  // 此时用的是英文兜底文案，渲染进程就绪后会推来当前语言的文案并触发重建
  buildApplicationMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createAppropriateWindow()
  })
})

app.on('window-all-closed', () => {
  stopCanvasWatcher()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopCanvasWatcher()
  closeDatabase()
})
