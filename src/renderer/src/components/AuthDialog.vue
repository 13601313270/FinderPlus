<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useAuth } from '@renderer/composables/useAuth'

/**
 * 登录 / 注册弹窗。
 *
 * - 自带 mask + dialog 壳，Esc / 点击遮罩关闭
 * - 两个 tab：登录 / 注册，可互相切换
 * - 注册 tab 有邮箱验证码倒计时
 * - 登录/注册成功后自动关闭弹窗
 * - 状态全部来自 useAuth composable（module 级单例）
 */
const { dialogVisible, activeTab, closeDialog, switchTab, sendEmailCode, doLogin, doRegister } = useAuth()

// —— 表单状态 ——
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const code = ref('')

const loading = ref(false)
const errorMsg = ref('')

// —— 验证码倒计时（秒），0 表示可以重新发送 ——
const codeCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | undefined

function startCooldown(): void {
  codeCooldown.value = 60
  clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    codeCooldown.value--
    if (codeCooldown.value <= 0) {
      clearInterval(cooldownTimer)
      cooldownTimer = undefined
    }
  }, 1000)
}

// 弹窗关闭时清理倒计时和表单
watch(dialogVisible, (v) => {
  if (!v) {
    clearInterval(cooldownTimer)
    cooldownTimer = undefined
    codeCooldown.value = 0
    email.value = ''
    password.value = ''
    confirmPassword.value = ''
    code.value = ''
    loading.value = false
    errorMsg.value = ''
  }
})

onUnmounted(() => {
  clearInterval(cooldownTimer)
})

// —— 表单验证 ——
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(e: string): string | null {
  if (!e) return '请输入邮箱'
  if (!EMAIL_RE.test(e)) return '邮箱格式不正确'
  return null
}

function validatePassword(p: string): string | null {
  if (!p) return '请输入密码'
  if (p.length < 6) return '密码至少 6 位'
  return null
}

/** 当前激活的是不是注册 tab */
const isRegister = computed(() => activeTab.value === 'register')

// —— 发送验证码 ——
async function onSendCode(): Promise<void> {
  const err = validateEmail(email.value)
  if (err) {
    errorMsg.value = err
    return
  }
  try {
    loading.value = true
    errorMsg.value = ''
    await sendEmailCode(email.value, 'register')
    startCooldown()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '发送失败'
  } finally {
    loading.value = false
  }
}

// —— 提交 ——
async function onSubmit(): Promise<void> {
  errorMsg.value = ''

  // 公共验证：邮箱 + 密码
  const emailErr = validateEmail(email.value)
  if (emailErr) {
    errorMsg.value = emailErr
    return
  }
  const pwdErr = validatePassword(password.value)
  if (pwdErr) {
    errorMsg.value = pwdErr
    return
  }

  if (isRegister.value) {
    // 注册额外验证：验证码 + 两次密码一致
    if (!code.value) {
      errorMsg.value = '请输入验证码'
      return
    }
    if (password.value !== confirmPassword.value) {
      errorMsg.value = '两次密码不一致'
      return
    }
    try {
      loading.value = true
      await doRegister(email.value, code.value, password.value)
      closeDialog()
    } catch (err) {
      errorMsg.value = err instanceof Error ? err.message : '注册失败'
    } finally {
      loading.value = false
    }
  } else {
    try {
      loading.value = true
      await doLogin(email.value, password.value)
      closeDialog()
    } catch (err) {
      errorMsg.value = err instanceof Error ? err.message : '登录失败'
    } finally {
      loading.value = false
    }
  }
}

// —— 弹窗关闭交互 ——
function onMaskClick(): void {
  if (!loading.value) closeDialog()
}

function onDialogClick(e: MouseEvent): void {
  e.stopPropagation()
}

function onKeyDown(e: KeyboardEvent): void {
  if (dialogVisible.value && e.key === 'Escape' && !loading.value) closeDialog()
  if (dialogVisible.value && e.key === 'Enter') void onSubmit()
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="dialogVisible" class="auth-mask" @click="onMaskClick">
      <div class="auth-dialog" @click="onDialogClick">
        <div class="auth-dialog__header">
          <div class="auth-tabs">
            <button
              class="auth-tab"
              type="button"
              :class="{ 'auth-tab--active': !isRegister }"
              @click="switchTab('login')"
              :disabled="loading"
            >登录</button>
            <button
              class="auth-tab"
              type="button"
              :class="{ 'auth-tab--active': isRegister }"
              @click="switchTab('register')"
              :disabled="loading"
            >注册</button>
          </div>
          <button
            class="auth-dialog__close"
            type="button"
            title="关闭 (Esc)"
            @click="closeDialog"
            :disabled="loading"
          >×</button>
        </div>

        <div class="auth-dialog__body">
          <!-- 邮箱 -->
          <div class="auth-field">
            <label class="auth-field__label">邮箱</label>
            <input
              v-model="email"
              class="auth-input"
              type="email"
              placeholder="your@email.com"
              autocomplete="email"
              :disabled="loading"
            />
          </div>

          <!-- 注册 tab：验证码 -->
          <div v-if="isRegister" class="auth-field">
            <label class="auth-field__label">验证码</label>
            <div class="auth-code-row">
              <input
                v-model="code"
                class="auth-input auth-input--code"
                type="text"
                placeholder="6 位验证码"
                maxlength="6"
                :disabled="loading"
              />
              <button
                class="auth-code-btn"
                type="button"
                :disabled="loading || codeCooldown > 0"
                @click="onSendCode"
              >
                {{ codeCooldown > 0 ? `${codeCooldown}s` : '发送验证码' }}
              </button>
            </div>
          </div>

          <!-- 密码 -->
          <div class="auth-field">
            <label class="auth-field__label">密码</label>
            <input
              v-model="password"
              class="auth-input"
              type="password"
              placeholder="至少 6 位"
              autocomplete="current-password"
              :disabled="loading"
            />
          </div>

          <!-- 注册 tab：确认密码 -->
          <div v-if="isRegister" class="auth-field">
            <label class="auth-field__label">确认密码</label>
            <input
              v-model="confirmPassword"
              class="auth-input"
              type="password"
              placeholder="再次输入密码"
              autocomplete="new-password"
              :disabled="loading"
            />
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMsg" class="auth-error">{{ errorMsg }}</div>

          <!-- 提交按钮 -->
          <button
            class="auth-submit"
            type="button"
            :disabled="loading"
            @click="onSubmit"
          >
            {{ loading ? '处理中…' : (isRegister ? '注册' : '登录') }}
          </button>

          <!-- 底部切换提示 -->
          <div class="auth-footer">
            <template v-if="isRegister">
              已有账号？
              <button class="auth-link" type="button" :disabled="loading" @click="switchTab('login')">
                去登录
              </button>
            </template>
            <template v-else>
              没有账号？
              <button class="auth-link" type="button" :disabled="loading" @click="switchTab('register')">
                去注册
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.auth-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: authFadeIn 0.15s ease;
}

.auth-dialog {
  width: 360px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: authPopIn 0.18s ease;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  &__close {
    all: unset;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: #9ca3af;
    font-size: 20px;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover:not(:disabled) {
      background: #f3f4f6;
      color: #374151;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__body {
    padding: 20px 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
}

// —— Tab 切换 ——
.auth-tabs {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.auth-tab {
  all: unset;
  cursor: pointer;
  padding: 12px 4px;
  margin-right: 12px;
  font-size: 14px;
  color: #9ca3af;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;

  &--active {
    color: #1a1a1a;
    border-bottom-color: #2563eb;
  }

  &:hover:not(:disabled) {
    color: #374151;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// —— 表单字段 ——
.auth-field {
  display: flex;
  flex-direction: column;
  gap: 5px;

  &__label {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
  }
}

.auth-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  font-size: 13px;
  color: #1a1a1a;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s, background 0.15s;

  &:focus {
    border-color: #2563eb;
    background: #fff;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--code {
    flex: 1;
    min-width: 0;
  }
}

.auth-code-row {
  display: flex;
  gap: 8px;
}

.auth-code-btn {
  all: unset;
  cursor: pointer;
  flex-shrink: 0;
  padding: 8px 14px;
  font-size: 12px;
  color: #2563eb;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;

  &:hover:not(:disabled) {
    background: #dbeafe;
  }

  &:disabled {
    color: #9ca3af;
    background: #f3f4f6;
    border-color: #e5e7eb;
    cursor: not-allowed;
  }
}

// —— 错误提示 ——
.auth-error {
  padding: 8px 12px;
  font-size: 12px;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}

// —— 提交按钮 ——
.auth-submit {
  all: unset;
  cursor: pointer;
  text-align: center;
  padding: 10px 16px;
  margin-top: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border-radius: 6px;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: #1d4ed8;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// —— 底部切换 ——
.auth-footer {
  text-align: center;
  font-size: 12px;
  color: #6b7280;
}

.auth-link {
  all: unset;
  cursor: pointer;
  color: #2563eb;
  font-weight: 500;
  margin-left: 4px;

  &:hover:not(:disabled) {
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@keyframes authFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes authPopIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
