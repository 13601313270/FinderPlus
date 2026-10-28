import { post } from './request'

/** 登录成功后返回的用户信息 */
export interface UserInfo {
  id: string
  email: string
  nickname?: string
  /** 可能存在的头像 URL */
  avatar?: string
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
export function register(email: string, code: string, password: string): Promise<AuthResult> {
  return post<AuthResult>('/auth/register', { email, code, password }, false)
}

/**
 * 邮箱登录
 * @param email 邮箱
 * @param password 密码
 */
export function login(email: string, password: string): Promise<AuthResult> {
  return post<AuthResult>('/auth/login', { email, password }, false)
}

/**
 * 服务端退出（让后端 token 失效）。
 * 即使后端返回 401，前端也要清本地 token——所以上层应 catch 后正常退出。
 */
export function logout(): Promise<unknown> {
  return post('/auth/logout', {}, true).catch(() => null)
}
