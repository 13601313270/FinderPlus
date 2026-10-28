import { ref, computed } from 'vue'
import type { UserInfo } from '@renderer/api/auth'
import { login, register, logout, sendCode } from '@renderer/api/auth'
import { getToken, setToken, clearToken } from '@renderer/api/request'

/** localStorage 里用户信息存储的 key */
const USER_KEY = 'auth_user'

// —— module-level 单例状态 ——
const token = ref<string | null>(getToken())
const user = ref<UserInfo | null>(readUser())
/** 登录/注册弹窗是否可见 */
const dialogVisible = ref(false)
/** 弹窗打开时默认显示哪个 tab：'login' 或 'register' */
const activeTab = ref<'login' | 'register'>('login')

function readUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UserInfo
  } catch {
    return null
  }
}

function persistUser(u: UserInfo | null): void {
  if (u) {
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  } else {
    localStorage.removeItem(USER_KEY)
  }
}

/**
 * 全局认证状态。
 * module-level 单例——App.vue 和 AuthDialog 共用同一份状态，
 * 登录成功后右上角按钮立刻从"登录"切换为用户信息。
 */
export function useAuth() {
  const isLoggedIn = computed(() => !!token.value && !!user.value)

  function openLogin(): void {
    activeTab.value = 'login'
    dialogVisible.value = true
  }

  function openRegister(): void {
    activeTab.value = 'register'
    dialogVisible.value = true
  }

  function closeDialog(): void {
    dialogVisible.value = false
  }

  function switchTab(tab: 'login' | 'register'): void {
    activeTab.value = tab
  }

  /** 保存登录/注册成功返回的 token + user */
  function saveAuth(t: string, u: UserInfo): void {
    setToken(t)
    persistUser(u)
    token.value = t
    user.value = u
  }

  /** 清除本地认证态（退出登录或启动时 token 失效） */
  function clearAuth(): void {
    clearToken()
    persistUser(null)
    token.value = null
    user.value = null
  }

  /** 发送邮箱验证码 */
  async function sendEmailCode(email: string, purpose = 'register'): Promise<void> {
    await sendCode(email, purpose)
  }

  /** 登录 */
  async function doLogin(email: string, password: string): Promise<void> {
    const result = await login(email, password)
    saveAuth(result.token, result.user)
  }

  /** 注册并自动登录（后端 register 返回 token + user） */
  async function doRegister(email: string, code: string, password: string): Promise<void> {
    const result = await register(email, code, password)
    saveAuth(result.token, result.user)
  }

  /** 退出登录：先通知后端，再清本地状态。后端报错也不影响本地清理。 */
  async function doLogout(): Promise<void> {
    try {
      await logout()
    } finally {
      clearAuth()
    }
  }

  return {
    token,
    user,
    isLoggedIn,
    dialogVisible,
    activeTab,
    openLogin,
    openRegister,
    closeDialog,
    switchTab,
    saveAuth,
    clearAuth,
    sendEmailCode,
    doLogin,
    doRegister,
    doLogout
  }
}
