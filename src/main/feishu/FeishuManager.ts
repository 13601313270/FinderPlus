import { BrowserWindow } from 'electron'
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { randomBytes } from 'node:crypto'

/** 飞书消息事件 payload——主进程推给 renderer 的轻量结构 */
export interface FeishuMessagePayload {
  messageId: string
  chatId: string
  /** 群聊 / 单聊 */
  chatType: 'group' | 'p2p'
  /** 发送人 ID（来自 sender_id 中第一个有值的字段） */
  senderId: string
  /** 发送人 ID 类型 */
  senderIdType: 'open_id' | 'user_id' | 'union_id' | 'email'
  /** 兜底显示名（目前拿不到昵称，和 senderId 一样） */
  senderName: string
  /** 消息文本 */
  text: string
  handledAt: number
}

export type FeishuConnState = 'idle' | 'connecting' | 'connected' | 'error'

export interface FeishuStatus {
  state: FeishuConnState
  error?: string
}

interface ActiveConnection {
  client: any
  appId: string
  appSecret: string
  state: FeishuConnState
  error?: string
}

let active: ActiveConnection | null = null
/** 已处理的 message_id 去重集合——上限 1000 防止内存泄漏 */
const seenMessages = new Set<string>()
const MAX_SEEN = 1000

/**
 * 从飞书 SDK (axios) 的错误对象里提取真正的可读错误信息。
 * SDK 把飞书返回的 { code, msg } 包在 err.response.data 里，
 * 直接取 err.message 只能拿到 "Request failed with status code 400" 这种无用信息。
 */
function extractFeishuError(err: unknown): string {
  if (err && typeof err === 'object') {
    // 标准飞书 SDK axios 错误结构：err.response.data = { code, msg }
    const response = (err as any).response
    if (response?.data?.msg) {
      const code = response.data.code
      return code ? `${response.data.msg}（错误码: ${code}）` : String(response.data.msg)
    }
    // 兼容纯 Error 对象
    if (err instanceof Error) return err.message
  }
  return String(err)
}

// —— ffmpeg 工具（音频/视频转码用）——

/**
 * 检测 ffmpeg 可用性——不仅检查能不能启动，还要检查指定编码器是否存在。
 * 有些系统上 ffmpeg 能跑但编进去的编码器不全（比如 brew 卸载残留），必须二次确认。
 */
function checkFfmpegEncoder(encoder: string): boolean {
  try {
    // ffmpeg -encoders 输出所有编码器列表（stdout）
    const result = spawnSync('ffmpeg', ['-encoders'], {
      shell: true,
      windowsHide: true,
      timeout: 5000,
      encoding: 'utf-8'
    })
    if (result.status !== 0) return false
    // 编码器列表格式：" V..... libopus         Opus audio encoder"
    return result.stdout?.includes(encoder) ?? false
  } catch {
    return false
  }
}

/** 检测 ffmpeg 音频编码器（libopus） */
function hasFfmpegAudioEncoder(): boolean {
  return checkFfmpegEncoder('libopus')
}
/** 检测 ffmpeg 视频编码器（libx264） */
function hasFfmpegVideoEncoder(): boolean {
  return checkFfmpegEncoder('libx264')
}

/** 把 DOM ArrayBuffer 落盘到临时文件，返回完整路径 */
function saveBufferToTempFile(buffer: ArrayBuffer, suffix: string): string {
  const tmpPath = join(tmpdir(), `feishu-${randomBytes(6).toString('hex')}${suffix}`)
  writeFileSync(tmpPath, Buffer.from(new Uint8Array(buffer)))
  return tmpPath
}

/** 推断飞书 im/v1/files 接受的 file_type 参数值 */
function inferFeishuFileType(fileName: string): string {
  const ext = extname(fileName).toLowerCase().replace(/^\./, '')
  // 飞书 im/v1/files API 明确支持的 file_type 枚举
  const map: Record<string, string> = {
    opus: 'opus',
    mp4: 'mp4',
    pdf: 'pdf',
    doc: 'doc', docx: 'doc',
    xls: 'xls', xlsx: 'xls',
    ppt: 'ppt', pptx: 'ppt',
    csv: 'csv',
    txt: 'txt',
    zip: 'zip',
    rar: 'rar',
    gz: 'tar.gz',
    md: 'md',
    json: 'json',
    html: 'html',
    css: 'css',
    js: 'js',
    png: 'png', jpg: 'jpg', jpeg: 'jpg', gif: 'gif', webp: 'webp', bmp: 'bmp',
    mp3: 'mp3', wav: 'wav', m4a: 'm4a', aac: 'aac', flac: 'flac',
    mov: 'mov', avi: 'avi', mkv: 'mkv',
  }
  return map[ext] ?? ext
}

/** ffmpeg 转码：把音频/视频统一格式化成飞书要求的 opus/mp4 */
function runFfmpeg(inputPath: string, outputPath: string, extraArgs: string[]): Promise<{ ok: boolean; stderr: string }> {
  return new Promise((resolve) => {
    const args = ['-y', '-i', inputPath, ...extraArgs, outputPath]
    const proc = spawn('ffmpeg', args, {
      shell: true,
      windowsHide: true
    })

    let stderr = ''
    proc.stderr?.on('data', (buf) => { stderr += buf.toString() })
    proc.stdout?.on('data', (buf) => { stderr += buf.toString() })

    proc.on('close', (code) => {
      resolve({ ok: code === 0, stderr })
    })
    proc.on('error', (err) => {
      resolve({ ok: false, stderr: err.message })
    })
  })
}

/** 音频 → OPUS（单声道 16kHz，飞书 audio 类型唯一接受的格式） */
async function convertAudioToOpus(inputPath: string, outputPath: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasFfmpegAudioEncoder()) {
    return { ok: false, error: '需要安装带 libopus 编码器的 ffmpeg 才能发送音频：macOS 执行 brew install ffmpeg' }
  }
  const args = ['-acodec', 'libopus', '-ac', '1', '-ar', '16000']
  const { ok, stderr } = await runFfmpeg(inputPath, outputPath, args)
  if (!ok) {
    // 截取最后 2 行关键错误，ffmpeg stderr 前几行是 banner
    const lastLines = stderr.trim().split('\n').slice(-3).join('\n')
    return { ok: false, error: '音频转 OPUS 失败：' + lastLines }
  }
  return { ok: true }
}

/** 视频 → MP4（H.264 + AAC，飞书 media 类型唯一接受的格式） */
async function convertVideoToMp4(inputPath: string, outputPath: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasFfmpegVideoEncoder()) {
    return { ok: false, error: '需要安装带 libx264 编码器的 ffmpeg 才能发送视频：macOS 执行 brew install ffmpeg' }
  }
  const args = ['-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p']
  const { ok, stderr } = await runFfmpeg(inputPath, outputPath, args)
  if (!ok) {
    const lastLines = stderr.trim().split('\n').slice(-3).join('\n')
    return { ok: false, error: '视频转 MP4 失败：' + lastLines }
  }
  return { ok: true }
}

/** 安全删除临时文件（忽略不存在等错误） */
function safeUnlink(path: string): void {
  try { unlinkSync(path) } catch { /* noop */ }
}

function markSeen(id: string): void {
  if (seenMessages.has(id)) return
  if (seenMessages.size >= MAX_SEEN) {
    // 满了就清一半——FIFO 近似，够用
    const arr = [...seenMessages]
    seenMessages.clear()
    for (let i = Math.floor(arr.length / 2); i < arr.length; i++) seenMessages.add(arr[i])
  }
  seenMessages.add(id)
}

function broadcastMessage(msg: FeishuMessagePayload): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('feishu:message', msg)
  }
}

function setError(err: string): void {
  if (active) {
    active.state = 'error'
    active.error = err
  }
}

function setConnected(): void {
  if (active) {
    active.state = 'connected'
    active.error = undefined
  }
}

/**
 * 建立飞书 WS 长连接。
 * 单例：同一时刻只允许一组 App 凭证在连；重复 start 且凭证相同则跳过，
 * 凭证不同则先 stop 再 start。
 */
export async function startFeishu(appId: string, appSecret: string): Promise<{ ok: true } | { ok: false; error: string }> {
  // 凭证校验
  if (!appId || !appSecret) {
    return { ok: false, error: 'App ID / App Secret 不能为空' }
  }

  // 已有连接且凭证相同 → 跳过
  if (active && active.appId === appId && active.appSecret === appSecret) {
    if (active.state === 'connected') return { ok: true }
    return { ok: true } // connecting/error 都让调用方继续等
  }

  // 凭证不同 → 先关旧的
  if (active) {
    try { active.client.close() } catch { /* noop */ }
    active = null
  }

  // 动态 import——main 构建用了 externalizeDepsPlugin，会正确 external 出去
  let Lark: any
  try {
    Lark = await import('@larksuiteoapi/node-sdk')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[FeishuManager] SDK 加载失败:', msg)
    return { ok: false, error: '飞书 SDK 加载失败: ' + msg }
  }

  active = {
    client: null,
    appId,
    appSecret,
    state: 'connecting'
  }

  try {
    console.log('[FeishuManager] SDK 加载成功，开始建立 WS 连接…')
    const eventDispatcher = new Lark.EventDispatcher({}).register({
      'im.message.receive_v1': (data: any) => {
        try {
          console.log('[FeishuManager] 收到原始事件:', JSON.stringify(data)?.slice(0, 500))
          // 飞书 schema 2.0 格式：message / sender 直接在顶层，没有 event 嵌套
          const message = data?.message
          const sender = data?.sender
          if (!message) {
            console.warn('[FeishuManager] message 字段缺失，跳过')
            return
          }

          console.log(`[FeishuManager] 消息概要: type=${message.message_type}, chat_id=${message.chat_id}, msg_id=${message.message_id}`)

          // 只处理文本消息
          if (message.message_type !== 'text') {
            console.log('[FeishuManager] 非 text 消息，跳过')
            return
          }

          // 去重——已经见过的直接跳过
          const messageId = message.message_id
          if (seenMessages.has(messageId)) return
          markSeen(messageId)

          // 解析消息体（飞书 text 消息的 content 是 JSON 字符串）
          let text = ''
          try {
            const parsed = JSON.parse(message.content)
            text = parsed.text ?? ''
          } catch {
            text = message.content ?? ''
          }

          // sender_id 结构可能同时有 open_id / user_id / union_id / email，哪个有值用哪个
          const sid = sender?.sender_id ?? {}
          let senderId = ''
          let senderIdType: FeishuMessagePayload['senderIdType'] = 'open_id'
          if (typeof sid.open_id === 'string' && sid.open_id) {
            senderId = sid.open_id
            senderIdType = 'open_id'
          } else if (typeof sid.user_id === 'string' && sid.user_id) {
            senderId = sid.user_id
            senderIdType = 'user_id'
          } else if (typeof sid.union_id === 'string' && sid.union_id) {
            senderId = sid.union_id
            senderIdType = 'union_id'
          } else if (typeof sid.email === 'string' && sid.email) {
            senderId = sid.email
            senderIdType = 'email'
          }

          const payload: FeishuMessagePayload = {
            messageId,
            chatId: message.chat_id,
            chatType: message.chat_type === 'group' ? 'group' : 'p2p',
            senderId,
            senderIdType,
            senderName: senderId || 'unknown',
            text,
            handledAt: Date.now()
          }

          broadcastMessage(payload)
        } catch (err) {
          console.error('[FeishuManager] 消息处理异常:', err)
        }
      }
    })

    const client = new Lark.WSClient({ appId, appSecret })
    client.start({ eventDispatcher })

    active.client = client

    console.log('[FeishuManager] WSClient.start() 已调用，state=connecting')

    // SDK 没有显式"连接成功"回调。WSClient.start() 非阻塞，内部自动重连。
    // 我们给 5 秒宽限期——期间如果收到消息自然 connected；超时后兜底 connected。
    setTimeout(() => {
      if (active && active.client === client && active.state === 'connecting') {
        setConnected()
      }
    }, 5000)

    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    setError(msg)
    return { ok: false, error: msg }
  }
}

/** 关闭 WS 连接 */
export function stopFeishu(): void {
  if (!active) return
  try {
    active.client.close()
  } catch { /* noop */ }
  active = null
}

/**
 * 上传图片到飞书开放平台，返回 image_key。
 * 发送图片消息前必须先上传——飞书不接受直接传图片二进制。
 *
 * 支持格式：JPG/JPEG/PNG/WEBP/GIF/BMP/ICO/TIFF/HEIC（TIFF/HEIC 自动转 JPG）
 * 大小限制：≤ 10MB
 */
export async function uploadFeishuImage(args: {
  appId: string
  appSecret: string
  fileName: string
  buffer: ArrayBuffer | Buffer
}): Promise<{ ok: true; imageKey: string } | { ok: false; error: string }> {
  if (!args.appId || !args.appSecret) {
    return { ok: false, error: 'App ID / App Secret 不能为空' }
  }
  if (!args.fileName) {
    return { ok: false, error: '文件名不能为空' }
  }
  if (!args.buffer || args.buffer.byteLength === 0) {
    return { ok: false, error: '图片内容为空' }
  }

  let Lark: any
  try {
    Lark = await import('@larksuiteoapi/node-sdk')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: '飞书 SDK 加载失败: ' + msg }
  }

  try {
    const client = new Lark.Client({ appId: args.appId, appSecret: args.appSecret })
    const nodeBuf = args.buffer instanceof Buffer ? args.buffer : Buffer.from(new Uint8Array(args.buffer as ArrayBuffer))
    const res = await client.im.image.create({
      data: {
        image_type: 'message',
        image: nodeBuf
      }
    })

    const imageKey = res?.image_key
      ?? res?.data?.image_key
      ?? res?.data?.data?.image_key
    if (!imageKey) {
      console.error('[FeishuManager] 上传图片响应缺少 image_key, 完整响应:', JSON.stringify(res)?.slice(0, 500))
      return { ok: false, error: '上传图片失败：飞书未返回 image_key' }
    }

    console.log('[FeishuManager] 上传图片成功, image_key:', imageKey)
    return { ok: true, imageKey }
  } catch (err) {
    const msg = extractFeishuError(err)
    console.error('[FeishuManager] 上传图片失败:', msg)
    return { ok: false, error: msg }
  }
}

/**
 * 上传文件/音频/视频到飞书开放平台，返回 file_key。
 * 走 im/v1/files 接口——和 uploadFeishuImage（im/v1/images）平行。
 *
 * file_type 参考飞书文档：opus/mp4/pdf/doc/xls/ppt/csv/txt/zip 等。
 * 大小限制：≤ 30MB
 */
export async function uploadFeishuFile(args: {
  appId: string
  appSecret: string
  fileName: string
  fileType: string
  buffer: ArrayBuffer | Buffer
  /** 音视频可选，毫秒 */
  durationMs?: number
}): Promise<{ ok: true; fileKey: string } | { ok: false; error: string }> {
  if (!args.appId || !args.appSecret) return { ok: false, error: 'App ID / App Secret 不能为空' }
  if (!args.fileName) return { ok: false, error: '文件名不能为空' }
  if (!args.fileType) return { ok: false, error: '文件类型不能为空' }
  if (!args.buffer || args.buffer.byteLength === 0) return { ok: false, error: '文件内容为空' }

  let Lark: any
  try {
    Lark = await import('@larksuiteoapi/node-sdk')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: '飞书 SDK 加载失败: ' + msg }
  }

  try {
    const client = new Lark.Client({ appId: args.appId, appSecret: args.appSecret })
    const nodeBuf = args.buffer instanceof Buffer ? args.buffer : Buffer.from(new Uint8Array(args.buffer as ArrayBuffer))
    const data: Record<string, unknown> = {
      file_type: args.fileType,
      file_name: args.fileName,
      file: nodeBuf
    }
    if (typeof args.durationMs === 'number' && args.durationMs > 0) {
      data.duration = args.durationMs
    }

    const res = await client.im.file.create({ data })

    // 和 uploadFeishuImage 一样，SDK 返回结构有多级可能
    const fileKey = res?.file_key
      ?? res?.data?.file_key
      ?? res?.data?.data?.file_key
    if (!fileKey) {
      console.error('[FeishuManager] 上传文件响应缺少 file_key:', JSON.stringify(res)?.slice(0, 300))
      return { ok: false, error: '上传文件失败：飞书未返回 file_key' }
    }

    console.log(`[FeishuManager] 上传${args.fileType}文件成功, file_key:`, fileKey)
    return { ok: true, fileKey }
  } catch (err) {
    const msg = extractFeishuError(err)
    console.error('[FeishuManager] 上传文件失败:', msg)
    return { ok: false, error: msg }
  }
}

 /**
 * 查询 ffmpeg 编码器可用性（给 renderer 发送前检查 + 弹窗确认用）。
 * 不阻塞——纯 spawnSync 本地查，耗时 <100ms。
 */
export function getFfmpegStatus(): {
  hasAny: boolean
  hasAudio: boolean  // libopus
  hasVideo: boolean   // libx264
  /** brew 安装命令 */
  installHint: string
} {
  const hasAudio = hasFfmpegAudioEncoder()
  const hasVideo = hasFfmpegVideoEncoder()
  return {
    hasAny: hasAudio || hasVideo,
    hasAudio,
    hasVideo,
    installHint: 'brew install ffmpeg'
  }
}

/** 飞书消息类型 */
export type FeishuMsgType = 'text' | 'image' | 'file' | 'audio' | 'media'

/**
 * 发送飞书消息。
 * 和 WS 长连接独立——WSClient 只管收事件，发消息需要单独 new 一个 REST Client。
 *
 * 支持五种消息类型：
 * - text：纯文本，传 text 字段
 * - image：图片，传 imageKey（uploadFeishuImage 拿）
 * - file：文件，传 fileKey（uploadFeishuFile 拿）
 * - audio：语音，传 fileKey（uploadFeishuFile 拿，file_type=opus）
 * - media：视频，传 fileKey（uploadFeishuFile 拿，file_type=mp4）
 */
export async function sendFeishuMessage(args: {
  appId: string
  appSecret: string
  receiveId: string
  receiveIdType: 'chat_id' | 'open_id' | 'user_id' | 'union_id' | 'email'
  msgType: FeishuMsgType
  /** text 类型时必填 */
  text?: string
  /** image 类型时必填 */
  imageKey?: string
  /** file/audio/media 类型时必填 */
  fileKey?: string
}): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  if (!args.appId || !args.appSecret) return { ok: false, error: 'App ID / App Secret 不能为空' }
  if (!args.receiveId) return { ok: false, error: '接收方 ID 不能为空' }

  let content: string
  const msgType = args.msgType

  if (msgType === 'text') {
    if (!args.text) return { ok: false, error: '消息内容为空' }
    content = JSON.stringify({ text: args.text })
  } else if (msgType === 'image') {
    if (!args.imageKey) return { ok: false, error: '图片 key 为空' }
    content = JSON.stringify({ image_key: args.imageKey })
  } else if (msgType === 'file' || msgType === 'audio' || msgType === 'media') {
    if (!args.fileKey) return { ok: false, error: '文件 key 为空' }
    content = JSON.stringify({ file_key: args.fileKey })
  } else {
    return { ok: false, error: '不支持的消息类型: ' + msgType }
  }

  let Lark: any
  try {
    Lark = await import('@larksuiteoapi/node-sdk')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: '飞书 SDK 加载失败: ' + msg }
  }

  try {
    const client = new Lark.Client({ appId: args.appId, appSecret: args.appSecret })
    const res = await client.im.message.create({
      params: { receive_id_type: args.receiveIdType },
      data: {
        receive_id: args.receiveId,
        msg_type: msgType,
        content
      }
    })

    console.log(`[FeishuManager] 发送${msgType}消息成功:`, JSON.stringify(res?.data)?.slice(0, 200))
    return { ok: true, messageId: res?.data?.message_id }
  } catch (err) {
    const msg = extractFeishuError(err)
    console.error(`[FeishuManager] 发送${msgType}消息失败:`, msg)
    return { ok: false, error: msg }
  }
}

/**
 * 一站式发送文件类消息（file/audio/media）。
 * 内部自动处理 ffmpeg 转码 → 上传 → 发送 → 清理临时文件的完整链路。
 *
 * @param args.kind  业务含义：'audio' 音频消息（自动转 OPUS）、'media' 视频消息（自动转 MP4）、'file' 普通文件（直接上传）
 * @param args.msgType 飞书 API 的 msg_type 值：'audio' | 'media' | 'file'
 * @param args.buffer 原始文件的 ArrayBuffer（renderer 读 DOM File 得到的）
 */
export async function sendFeishuFilePipeline(args: {
  appId: string
  appSecret: string
  receiveId: string
  receiveIdType: 'chat_id' | 'open_id' | 'user_id' | 'union_id' | 'email'
  kind: 'file' | 'audio' | 'media'
  fileName: string
  buffer: ArrayBuffer
  durationMs?: number
}): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  if (!args.appId || !args.appSecret) return { ok: false, error: 'App ID / App Secret 不能为空' }
  if (!args.receiveId) return { ok: false, error: '接收方 ID 不能为空' }
  if (!args.buffer || args.buffer.byteLength === 0) return { ok: false, error: '文件内容为空' }

  const originalExt = extname(args.fileName).toLowerCase()
  let processedBuffer: ArrayBuffer | Buffer = args.buffer
  let finalFileName = args.fileName
  let finalFileType: string
  const tempPaths: string[] = []

  // —— 需要 ffmpeg 转码的场景：audio → opus，media → mp4 ——
  try {
    if (args.kind === 'audio' && originalExt !== '.opus') {
      // 音频转 OPUS
      const inputPath = saveBufferToTempFile(args.buffer, originalExt || '.tmp')
      tempPaths.push(inputPath)
      const outputPath = join(tmpdir(), `feishu-${randomBytes(6).toString('hex')}.opus`)
      tempPaths.push(outputPath)

      const convRes = await convertAudioToOpus(inputPath, outputPath)
      if (!convRes.ok) {
        return { ok: false, error: convRes.error ?? '音频转码失败' }
      }
      processedBuffer = readFileSync(outputPath)
      finalFileName = (args.fileName.replace(/\.[^.]+$/, '') || 'audio') + '.opus'
      finalFileType = 'opus'
    } else if (args.kind === 'media' && originalExt !== '.mp4') {
      // 视频转 MP4
      const inputPath = saveBufferToTempFile(args.buffer, originalExt || '.tmp')
      tempPaths.push(inputPath)
      const outputPath = join(tmpdir(), `feishu-${randomBytes(6).toString('hex')}.mp4`)
      tempPaths.push(outputPath)

      const convRes = await convertVideoToMp4(inputPath, outputPath)
      if (!convRes.ok) {
        return { ok: false, error: convRes.error ?? '视频转码失败' }
      }
      processedBuffer = readFileSync(outputPath)
      finalFileName = (args.fileName.replace(/\.[^.]+$/, '') || 'video') + '.mp4'
      finalFileType = 'mp4'
    } else if (args.kind === 'audio') {
      // 已经是 .opus，无需转码
      finalFileType = 'opus'
    } else if (args.kind === 'media') {
      // 已经是 .mp4，无需转码
      finalFileType = 'mp4'
    } else {
      // 普通文件：直接按扩展名推断 file_type
      finalFileType = inferFeishuFileType(args.fileName)
    }

    // —— 上传 ——
    const uploadRes = await uploadFeishuFile({
      appId: args.appId,
      appSecret: args.appSecret,
      fileName: finalFileName,
      fileType: finalFileType,
      buffer: processedBuffer,
      durationMs: args.durationMs
    })
    if (!uploadRes.ok) {
      return { ok: false, error: uploadRes.error }
    }

    // —— 发送 ——
    const sendRes = await sendFeishuMessage({
      appId: args.appId,
      appSecret: args.appSecret,
      receiveId: args.receiveId,
      receiveIdType: args.receiveIdType,
      msgType: args.kind,
      fileKey: uploadRes.fileKey
    })
    return sendRes
  } finally {
    // 无论成功失败都清理临时文件
    for (const p of tempPaths) safeUnlink(p)
  }
}

/** 查询当前连接状态 */
export function getFeishuStatus(): FeishuStatus {
  if (!active) return { state: 'idle' }
  return { state: active.state, error: active.error }
}

/** 应用退出时清理 */
export function disposeFeishu(): void {
  stopFeishu()
  seenMessages.clear()
}
