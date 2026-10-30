import { get, post } from './request'

async function deriveK(email: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${email.trim().toLowerCase()}:${password}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hmacResponse(k: string, nonce: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(k), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(nonce))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** 登录成功后返回的用户信息 */
export interface UserInfo {
  id: string
  email: string
  display_name: string
}

/** 登录 / 注册成功后 data 里的结构 */
export interface AuthResult {
  token: string
  user: UserInfo
}

/**
 * 发送邮箱验证码
 * @param email 目标邮箱
 * @param purpose 验证码用途：'register' 注册（后续可以扩展 'reset' 找回密码）
 */
export function sendCode(email: string, purpose = 'register'): Promise<unknown> {
  return post('/auth/sendCode', { email, purpose })
}

/**
 * 邮箱注册
 * @param email 邮箱
 * @param code  验证码
 * @param password 密码
 */
export async function register(email: string, code: string, password: string): Promise<{ok: boolean; error?: string}> {
  const k = await deriveK(email, password)
  return post('/auth/register', { email, code, k })
}

/**
 * 邮箱登录
 * @param email 邮箱
 * @param password 密码
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  const k = await deriveK(email, password)

  // 第一步：拿一次性挑战（120 秒有效）
  const challengeRes = await post(
    '/auth/challenge',
    { email },
  )
  if (!challengeRes.ok) {
    throw new Error(challengeRes.error ?? '获取登录挑战失败')
  }

  // 第二步：证明知道密码（传输里没有 K，没有密码）
  const response = await hmacResponse(k, challengeRes.nonce)
  const hardwareIdPromise = window.systemApi.getHardwareId()
  const deviceNamePromise = window.systemApi.getDeviceName()
  const [hardwareId, deviceName] = await Promise.all([hardwareIdPromise, deviceNamePromise])
  return post(
    '/auth/login',
    { email, nonce: challengeRes.nonce, response, hardware_id: hardwareId, device_name: deviceName }
  )
}

/**
 * 服务端退出（让后端 token 失效）。
 * 即使后端返回 401，前端也要清本地 token——所以上层应 catch 后正常退出。
 */
export function logout(): Promise<unknown> {
  return post('/auth/logout', {}).catch(() => null)
}

/**
 * 拉取当前登录用户的详细信息。
 * 需要在 header 里带 token（默认 auth=true）。
 */
export function fetchUserInfo(): Promise<UserInfo> {
  return get('/user/info')
}

/** 协作者：被授予我调用权限的用户（/access/list 返回的项） */
export interface Collaborator {
  id: number
  /** 授权人（协作者）邮箱 */
  grantor_user_email: string
  /** 授权人（协作者）用户 ID */
  grantor_user_id: number
  /** 授权画布 ID（空字符串表示全局授权） */
  scope_canvas_id: string
  /** 授权创建时间（Unix 秒级时间戳） */
  created_at: number
  /** 过期时间（Unix 秒级时间戳，0 表示永不过期） */
  expires_at: number
}

/**
 * 拉取我被授予调用权限的所有协作者列表（/access/list）。
 * 这些协作者是 grantor（授权人），我是 grantee（被授权人）。
 */
export function fetchCollaborators(): Promise<{ count: number; res: Collaborator[] }> {
  return get('/access/list')
}

/** 申请协作的接口返回结构 */
export interface AccessRequestResult {
  ok: boolean
  request_id?: number
  expires_at?: number
  error?: string
}

/**
 * 向指定邮箱发送协作申请。
 * POST /access/request，body { email, message }
 */
export function requestCollaboration(email: string, message: string): Promise<AccessRequestResult> {
  return post('/access/request', { email, message })
}

/** 我发起的协作申请记录 */
export interface MyAccessRequest {
  id: number
  target_user_id: number
  targetEmail: string
}

/** 我收到的（别人发起的）协作申请记录 */
export interface ReceivedAccessRequest {
  id: number
  requester_user_email: string
  requester_user_id: number
}

/**
 * 查询我发起的全部协作申请。
 * GET /access/myRequests
 */
export function fetchMyRequests(): Promise<MyAccessRequest[]> {
  return get('/access/myRequests')
}

/**
 * 撤销一条我发起的协作申请。
 * POST /access/cancel，body { requestId }
 */
export function cancelAccessRequest(requestId: number): Promise<{ ok: boolean; error?: string }> {
  return post('/access/cancel', { requestId })
}

/**
 * 查询我收到的（别人发起的）协作申请列表。
 * GET /access/myBeReceived
 */
export function fetchMyBeReceived(): Promise<ReceivedAccessRequest[]> {
  return get('/access/myBeReceived')
}

/**
 * 拒绝一条我收到的协作申请。
 * POST /access/reject，body { requestId }
 */
export function rejectAccessRequest(requestId: number): Promise<{ ok: boolean; error?: string }> {
  return post('/access/reject', { requestId })
}

/**
 * 同意一条我收到的协作申请。
 * POST /access/resolve，body { requestId }
 */
export function resolveAccessRequest(requestId: number): Promise<{ ok: boolean; error?: string }> {
  return post('/access/resolve', { requestId })
}

/** 我授权出去的已授权记录（/access/resolveList 返回的项） */
export interface GrantedAccess {
  id: number
  grantee_user_id: number
  grantee_user_email: string
  /** 授权画布 ID（空字符串表示全局授权） */
  scope_canvas_id: string
  /** 授权状态（推测：1=有效） */
  status: number
  /** 创建时间（Unix 秒级时间戳） */
  created_at: number
  /** 过期时间（Unix 秒级时间戳，0 表示永不过期） */
  expires_at: number
}

/**
 * 查询我授权出去的已授权列表。
 * GET /access/resolveList
 */
export function fetchResolveList(): Promise<GrantedAccess[]> {
  return get('/access/resolveList')
}
