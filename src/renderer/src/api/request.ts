/**
 * 通用 HTTP 请求封装：
 * - 自动从 localStorage 读 token 并注入 header
 * - 统一解包后端 { ok, error?, ...data } 响应结构
 * - ok === true 视为成功，返回剩余字段；ok === false 抛出 error 或默认文案
 */

/** 后端基础地址。可以后续做成设置页可配置项 */
export const API_BASE = 'https://api.studying1v1.com/canvasDesk'

/** localStorage 里 token 存储的 key */
const TOKEN_KEY = 'auth_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 发一个 POST 请求到指定路径。
 * 路径相对于 API_BASE（例如 '/auth/login'）。
 * 成功时返回响应中 ok=true 的 data（后端可以直接返回业务字段）；
 * 失败时 throw Error(error)。
 */
/**
 * 发一个 GET 请求到指定路径。
 * 路径相对于 API_BASE（例如 '/user/info'）。
 * 成功时返回响应中 ok=true 的 data；失败时 throw Error(error)。
 */
export async function get<T = Record<string, unknown>>(path: string, auth = true): Promise<T> {
  const headers: Record<string, string> = {}
  if (auth) {
    const token = getToken()
    if (token) headers['token'] = token
  }

  let res: Response
  try {
    res = await fetch(API_BASE + path, { method: 'GET', headers })
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : '网络请求失败')
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  let json: { ok: boolean; error?: string; [key: string]: unknown }
  try {
    json = (await res.json()) as { ok: boolean; error?: string; [key: string]: unknown }
  } catch {
    throw new Error('响应格式错误')
  }

  if (!json.ok) {
    throw new Error(json.error || '接口请求失败')
  }

  const { ...rest } = json
  return rest as T
}

export async function post<T = Record<string, unknown>>(path: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (auth) {
    const token = getToken()
    if (token) headers['token'] = token
  }

  let res: Response
  try {
    res = await fetch(API_BASE + path, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : '网络请求失败')
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  let json: { ok: boolean; error?: string; [key: string]: unknown }
  try {
    json = (await res.json()) as { ok: boolean; error?: string; [key: string]: unknown }
  } catch {
    throw new Error('响应格式错误')
  }

  if (!json.ok) {
    throw new Error(json.error || '接口请求失败')
  }

  // ok=true 时剥离 ok/error 字段，把剩余业务字段作为 data 返回
  const { ...rest } = json
  return rest as T
}
