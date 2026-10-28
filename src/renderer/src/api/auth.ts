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
  return post('/auth/sendCode', { email, purpose }, false)
}

/**
 * 邮箱注册
 * @param email 邮箱
 * @param code  验证码
 * @param password 密码
 */
export async function register(email: string, code: string, password: string): Promise<AuthResult> {
  const k = await deriveK(email, password)
  return post<AuthResult>('/auth/register', { email, code, k }, false)
  // return post<AuthResult>('/auth/register', { email, code, password }, false)
}

/**
 * 邮箱登录
 * @param email 邮箱
 * @param password 密码
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  const k = await deriveK(email, password)

  // 第一步：拿一次性挑战（120 秒有效）
  const challengeRes = await post<{ ok: boolean; nonce: string; error?: string }>(
    '/auth/challenge',
    { email },
    false
  )
  if (!challengeRes.ok) {
    throw new Error(challengeRes.error ?? '获取登录挑战失败')
  }

  // 第二步：证明知道密码（传输里没有 K，没有密码）
  const response = await hmacResponse(k, challengeRes.nonce)
  return post<AuthResult>(
    '/auth/login',
    { email, nonce: challengeRes.nonce, response },
    false
  )
}

/**
 * 服务端退出（让后端 token 失效）。
 * 即使后端返回 401，前端也要清本地 token——所以上层应 catch 后正常退出。
 */
export function logout(): Promise<unknown> {
  return post('/auth/logout', {}, true).catch(() => null)
}

/**
 * 拉取当前登录用户的详细信息。
 * 需要在 header 里带 token（默认 auth=true）。
 */
export function fetchUserInfo(): Promise<UserInfo> {
  return get<UserInfo>('/user/info', true)
}
