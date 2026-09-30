import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, basename, extname } from 'node:path'
import { copyFileSync, existsSync, readFileSync, unlinkSync, watch, writeFileSync } from 'node:fs'
import { exec } from 'node:child_process'
import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { openDatabase, closeDatabase, getDatabase, persist } from './db/database'
import { SqliteStorage } from './db/SqliteStorage'
import { ensureCanvasDir, getCanvasDir } from './paths'

let storage: SqliteStorage | null = null
let canvasWatcher: ReturnType<typeof watch> | null = null

/**
 * 启动画布目录文件监听。
 * 监听整个画布目录（文稿/CanvasDesk/我的画布），任何文件变化（修改/新增/删除）
 * 都会 debounce 300ms 后通过 webContents.send('file:changed', fileName) 推送给 renderer，
 * 让 TxtFileNode / ImgFileNode 等文件节点重新读取并 commit 输出端口。
 *
 * fs.watch 在不同平台有差异：
 * - macOS 默认只给 change 事件（目录级），文件名要从 filename 参数拿
 * - 某些编辑器原子保存（写临时文件 + rename）会连续触发多次，debounce 搞定
 *
 * 只启动一个 watcher（整个进程一个画布目录），跟随 BrowserWindow 生命周期——
 * 窗口全关就停掉 watcher，避免进程后台挂着监听。
 */
function startCanvasWatcher(): void {
  if (canvasWatcher) return
  canvasWatcher = watch(getCanvasDir(), { encoding: 'utf-8' }, (_event, fileName) => {
    if (!fileName) return
    debouncePushChange(fileName)
  })
  console.log('[main] 画布目录文件监听已启动：', getCanvasDir())
}

/** 防止短时间内对同一个文件重复推送（编辑器保存连发事件） */
const pendingPushes = new Map<string, NodeJS.Timeout>()
function debouncePushChange(fileName: string): void {
  const existing = pendingPushes.get(fileName)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    pendingPushes.delete(fileName)
    // 推送给所有窗口（目前只有一个，但多窗口扩展时自然生效）
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('file:changed', fileName)
    }
  }, 300)
  pendingPushes.set(fileName, timer)
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

  // 读画布目录下的文本文件内容（给 TxtFileNode 用）
  ipcMain.handle('file:readText', (_e, fileName: string): string => {
    const targetPath = join(getCanvasDir(), fileName)
    return readFileSync(targetPath, 'utf-8')
  })

  // 读画布目录下的任意文件，返回 base64 编码（给通用文件节点用）
  ipcMain.handle('file:readBinary', (_e, fileName: string): string => {
    const targetPath = join(getCanvasDir(), fileName)
    return readFileSync(targetPath, 'base64')
  })

  /**
   * 把一个**已经在磁盘上存在**的文件（比如拖拽进来的，源路径由 Electron File.path 提供）
   * 复制到画布目录。
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
  }): { fileName: string; size: number } => {
    const canvasDir = getCanvasDir()
    ensureCanvasDir()
    const targetName = args.overwrite
      ? args.fileName
      : resolveNonCollidingName(canvasDir, args.fileName)
    const targetPath = join(canvasDir, targetName)
    const buffer = Buffer.from(args.base64, 'base64')
    writeFileSync(targetPath, buffer)
    return { fileName: targetName, size: buffer.length }
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

  /** 检查画布目录下文件是否还存在（外部拖拽结束后判断节点要不要删） */
  ipcMain.handle('file:exists', (_e, fileName: string): boolean => {
    return existsSync(join(getCanvasDir(), fileName))
  })

  /**
   * 把画布目录下的文件名解析成磁盘绝对路径。
   * 给文件节点的「路径」输出端口用——渲染进程拿不到真实磁盘路径
   * （Electron 在 contextIsolation 下会剥离 File.path），只能回主进程拼。
   */
  ipcMain.handle('file:getFullPath', (_e, fileName: string): string => {
    return join(getCanvasDir(), fileName)
  })

  /**
   * 用系统默认应用打开画布目录下的文件。
   * 双击文件节点图标时调用——用户想在 Finder 关联的 App 里编辑/预览文件。
   *
   * 返回 { ok } 表示成功；{ ok: false, error } 带失败原因。
   * shell.openPath 在目标文件不存在或关联应用被卸载时会返回非空错误信息。
   */
  ipcMain.handle('file:openInSystem', async (_e, fileName: string): Promise<{ ok: boolean; error?: string }> => {
    const fullPath = join(getCanvasDir(), fileName)
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
  startCanvasWatcher()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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
