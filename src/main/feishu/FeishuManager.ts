import { BrowserWindow } from 'electron'

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
  buffer: ArrayBuffer
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
    // SDK 接受 Node.js Buffer，把 renderer 传过来的 ArrayBuffer 转一下
    const nodeBuf = Buffer.from(args.buffer)
    const res = await client.im.image.create({
      data: {
        image_type: 'message',
        image: nodeBuf
      }
    })

    // SDK 不同版本返回结构可能不同，做多级 fallback：
    // 1. 顶层 res.image_key（部分版本）
    // 2. res.data.image_key（标准文档结构）
    // 3. res.data.data.image_key（嵌套结构）
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

/** 飞书消息类型 */
export type FeishuMsgType = 'text' | 'image'

/**
 * 发送飞书消息。
 * 和 WS 长连接独立——WSClient 只管收事件，发消息需要单独 new 一个 REST Client。
 *
 * 支持两种消息类型：
 * - text：纯文本，传 text 字段
 * - image：图片，传 imageKey 字段（需先调 uploadFeishuImage 拿 key）
 */
export async function sendFeishuMessage(args: {
  appId: string
  appSecret: string
  receiveId: string
  receiveIdType: 'chat_id' | 'open_id' | 'user_id' | 'union_id' | 'email'
  msgType: FeishuMsgType
  /** text 类型时必填 */
  text?: string
  /** image 类型时必填（先调 uploadFeishuImage 拿 key） */
  imageKey?: string
}): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  if (!args.appId || !args.appSecret) {
    return { ok: false, error: 'App ID / App Secret 不能为空' }
  }
  if (!args.receiveId) {
    return { ok: false, error: '接收方 ID 不能为空' }
  }

  // 按类型校验必填字段
  let content: string
  let msgType: FeishuMsgType = args.msgType

  if (msgType === 'text') {
    if (!args.text) return { ok: false, error: '消息内容为空' }
    content = JSON.stringify({ text: args.text })
  } else if (msgType === 'image') {
    if (!args.imageKey) return { ok: false, error: '图片 key 为空，请先上传图片' }
    content = JSON.stringify({ image_key: args.imageKey })
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
