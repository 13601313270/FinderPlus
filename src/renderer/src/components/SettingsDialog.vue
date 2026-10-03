<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGlobalSettings } from '@renderer/composables/useGlobalSettings'
import {
  useLanguageSettings,
  type LanguageCode
} from '@renderer/composables/useLanguageSettings'
import { useOnboarding } from '@renderer/composables/useOnboarding'
import {
  LLM_PROVIDERS,
  useLLMSettings,
  type LLMProvider
} from '@renderer/composables/useLLMSettings'
import SelectMenu from './SelectMenu.vue'

/**
 * 全局设置弹窗（机制版）：
 * - 自带弹窗壳（Teleport + mask + dialog + header + body + Esc 关闭）
 * - 状态来自 useGlobalSettings（module 级单例），工具栏按钮和系统应用菜单共享
 * - 具体设置项按分区往 body 里加，当前已有「语言」和「数据迁移」
 */
const { t } = useI18n()
const { visible, openSettings, closeSettings } = useGlobalSettings()
const { language, setLanguage, languageOptions } = useLanguageSettings()
const { restart: restartOnboarding } = useOnboarding()
const {
  initDraft: initLLMDraft,
  draftKeys: llmDraftKeys,
  saveProviderKey: saveLLMProviderKey,
  clearKey: clearLLMKey
} = useLLMSettings()

/** SettingsDialog 打开时同步初始化 LLM draft */
watch(visible, (v) => {
  if (v) initLLMDraft()
})

const llmProviders = Object.entries(LLM_PROVIDERS) as [LLMProvider, typeof LLM_PROVIDERS[LLMProvider]][]

/** 重置新手引导：清除 seen 标记并立即弹出 */
function onRestartOnboarding(): void {
  closeSettings()
  restartOnboarding()
}

/** 语言选项 → SelectMenu 需要的 { value, label } */
const languageSelectOptions = computed(() =>
  languageOptions.map((opt) => ({ value: opt.code, label: opt.label }))
)

function onLanguageChange(value: string): void {
  setLanguage(value as LanguageCode)
}

/** 迁移按钮禁用状态（防止重复点击） */
const transferBusy = ref(false)

// —— 导出 / 导入 核心逻辑 ——

/** localStorage 中需要导出的 key（全部，但部分要剥离敏感信息） */
const EXPORT_KEYS = [
  'canvasdesk.language',
  'canvasdesk.llm.config',
  'canvasdesk.image.config',
  'canvasdesk.tutorialSeen'
]

/**
 * 把一个 JSON 字符串里的所有 API Key 字段置空。
 * - LLM config：providers[*].key
 * - Image config：providers[*].key
 */
function stripApiKeys(raw: string): string {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>
    if (obj && typeof obj === 'object' && 'providers' in obj) {
      const providers = (obj.providers as Record<string, { key?: string }>) ?? {}
      for (const p of Object.keys(providers)) {
        if (providers[p] && typeof providers[p] === 'object') {
          providers[p].key = ''
        }
      }
    }
    return JSON.stringify(obj)
  } catch {
    // 不是 JSON，原样返回（比如 tutorialSeen 只是 '1'）
    return raw
  }
}

/** 收集 localStorage 配置，剥离 API Key，返回可写入 zip 的 config.json 内容 */
function collectConfigForExport(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of EXPORT_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      // 只对 config 类型的 JSON 做剥离
      if (key === 'canvasdesk.llm.config' || key === 'canvasdesk.image.config') {
        out[key] = stripApiKeys(raw)
      } else {
        out[key] = raw
      }
    }
  }
  return out
}

/** 把 config.json 里的键值对写回 localStorage（导入恢复用） */
function restoreConfigFromImport(config: Record<string, string>): void {
  for (const [key, value] of Object.entries(config)) {
    localStorage.setItem(key, value)
  }
}

/** 导出按钮点击 */
async function handleExport(): Promise<void> {
  transferBusy.value = true
  try {
    // 1. 弹 save dialog
    const defaultName = `canvasdesk-backup-${new Date().toISOString().slice(0, 10)}.zip`
    const savePath = await window.dialogApi?.showSave({
      title: t('settingsDialog.transferTitle'),
      defaultPath: defaultName,
      filters: [
        { name: 'Zip Archive', extensions: ['zip'] }
      ]
    })
    if (!savePath) return // 用户取消

    // 2. 收集配置（剥离 API Key）
    const configObj = collectConfigForExport()
    const configJson = JSON.stringify(configObj)

    // 3. 调主进程打包
    const result = await window.transferApi?.exportData(savePath, configJson)
    if (result?.ok) {
      alert(t('settingsDialog.exportSuccess'))
    } else {
      alert(`Export failed: ${result?.error ?? 'Unknown error'}`)
    }
  } catch (err) {
    alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    transferBusy.value = false
  }
}

/** 导入按钮点击 */
async function handleImport(): Promise<void> {
  // 1. 确认弹窗
  if (!window.confirm(t('settingsDialog.importConfirmBody'))) return

  transferBusy.value = true
  try {
    // 2. 弹 open dialog
    const zipPath = await window.dialogApi?.showOpen({
      title: t('settingsDialog.transferTitle'),
      filters: [
        { name: 'Zip Archive', extensions: ['zip'] }
      ]
    })
    if (!zipPath) return // 用户取消

    // 3. 调主进程恢复
    const result = await window.transferApi?.importData(zipPath)
    if (result?.ok) {
      // 4. 把 config.json 写回 localStorage
      try {
        const configObj = JSON.parse(result.configJson) as Record<string, string>
        restoreConfigFromImport(configObj)
      } catch {
        // config.json 解析失败就跳过——DB 和文件已经恢复了
      }
      // 5. 自动刷新页面以加载新 DB 数据和节点图
      alert(t('settingsDialog.importSuccess'))
      window.location.reload()
      return
    } else {
      alert(`Import failed: ${result?.error ?? 'Unknown error'}`)
    }
  } catch (err) {
    alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    transferBusy.value = false
  }
}

/** 系统应用菜单「设置…」触发的取消订阅句柄 */
let disposeMenuListener: (() => void) | undefined

function onMaskClick(): void {
  closeSettings()
}

function onDialogClick(e: MouseEvent): void {
  e.stopPropagation()
}

function onKeyDown(e: KeyboardEvent): void {
  if (visible.value && e.key === 'Escape') closeSettings()
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  // 系统应用菜单（macOS 顶部菜单栏「设置…」）触发的入口 → 打开同一个弹窗
  disposeMenuListener = window.appMenuApi?.onOpenSettings(openSettings)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  disposeMenuListener?.()
})

// —— LLM 保存反馈 ——
/** 正在显示"已保存"反馈的 provider 集合 */
const savedProviders = ref<Set<LLMProvider>>(new Set())

function onSaveProviderKey(provider: LLMProvider): void {
  saveLLMProviderKey(provider)
  // 短暂显示反馈
  savedProviders.value.add(provider)
  setTimeout(() => {
    savedProviders.value.delete(provider)
  }, 1500)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="gs-mask" @click="onMaskClick">
      <div class="gs-dialog" @click="onDialogClick">
        <div class="gs-dialog__header">
          <h3 class="gs-dialog__title">{{ t('settingsDialog.title') }}</h3>
          <button
            class="gs-dialog__close"
            type="button"
            :title="t('settingsDialog.close')"
            @click="closeSettings"
          >×</button>
        </div>

        <div class="gs-dialog__body">
          <!-- 设置分区：后续每类全局设置在这里加一块 -->
          <section class="gs-section">
            <h4 class="gs-section__title">{{ t('settingsDialog.language') }}</h4>
            <p class="gs-section__hint">{{ t('settingsDialog.languageHint') }}</p>
            <SelectMenu
              :model-value="language"
              :options="languageSelectOptions"
              :aria-label="t('settingsDialog.language')"
              @update:model-value="onLanguageChange"
            />
          </section>

          <!-- LLM API Key 配置（每个服务商单独一行） -->
          <section class="gs-section">
            <h4 class="gs-section__title">大语言模型 API Key</h4>
            <p class="gs-section__hint">
              在此配置各服务商的 API Key。每个 LLM 节点可独立选择使用哪个服务商和模型。
            </p>

            <div class="gs-llm__key-list">
              <div
                v-for="[key, preset] in llmProviders"
                :key="key"
                class="gs-llm__key-row"
              >
                <div class="gs-llm__key-header">
                  <span class="gs-llm__key-label">{{ preset.label }}</span>
                  <!-- <span
                    class="gs-llm__key-status"
                    :class="{ 'gs-llm__key-status--set': llmDraftKeys[key].length > 0 }"
                  >{{ llmDraftKeys[key].length > 0 ? '已配置' : '未配置' }}</span> -->
                </div>
                <div class="gs-llm__key-input-row">
                  <input
                    v-model="llmDraftKeys[key]"
                    class="gs-llm__input"
                    type="password"
                    :placeholder="`${preset.label} API Key`"
                    autocomplete="off"
                    spellcheck="false"
                  />
                  <button
                    class="gs-btn gs-btn--ghost gs-btn--clear-sm"
                    type="button"
                    :disabled="!llmDraftKeys[key]"
                    @click="clearLLMKey(key)"
                  >清除</button>
                  <button
                    class="gs-btn gs-btn--primary gs-btn--save-sm"
                    :class="{ 'gs-btn--saved': savedProviders.has(key) }"
                    type="button"
                    @click="onSaveProviderKey(key)"
                  >{{ savedProviders.has(key) ? '已保存' : '保存' }}</button>
                </div>
              </div>
            </div>
          </section>

          <!-- 数据迁移 -->
          <section class="gs-section">
            <h4 class="gs-section__title">{{ t('settingsDialog.transferTitle') }}</h4>
            <p class="gs-section__hint">{{ t('settingsDialog.transferHint') }}</p>
            <p class="gs-section__hint gs-section__hint--warn">{{ t('settingsDialog.exportKeyHint') }}</p>
            <div class="gs-transfer__actions">
              <button
                class="gs-btn gs-btn--primary"
                type="button"
                :disabled="transferBusy"
                @click="handleExport"
              >{{ t('settingsDialog.export') }}</button>
              <button
                class="gs-btn"
                type="button"
                :disabled="transferBusy"
                @click="handleImport"
              >{{ t('settingsDialog.import') }}</button>
            </div>
          </section>

          <!-- 新手引导 -->
          <section class="gs-section">
            <h4 class="gs-section__title">{{ t('settingsDialog.onboardingSection') }}</h4>
            <p class="gs-section__hint">{{ t('settingsDialog.onboardingHint') }}</p>
            <div class="gs-transfer__actions">
              <button
                class="gs-btn"
                type="button"
                @click="onRestartOnboarding"
              >{{ t('settingsDialog.onboardingRestart') }}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.gs-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: gsFadeIn 0.15s ease;
}

.gs-dialog {
  width: 520px;
  max-height: 80vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: gsPopIn 0.18s ease;
  overflow: hidden;
  user-select: text;
  -webkit-user-select: text;

  &__header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  &__title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
  }

  &__close {
    all: unset;
    cursor: pointer;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: #9ca3af;
    font-size: 20px;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #f3f4f6;
      color: #374151;
    }
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }
}

.gs-section {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }

  &__title {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }

  &__hint {
    margin: 0 0 10px;
    font-size: 12px;
    color: #9ca3af;

    &--warn {
      color: #d97706; /* amber-600 */
    }
  }
}

.gs-transfer {
  &__actions {
    display: flex;
    gap: 8px;
  }
}

.gs-btn {
  all: unset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--primary {
    background: #2563eb;
    border-color: #2563eb;
    color: #fff;

    &:hover:not(:disabled) {
      background: #1d4ed8;
      border-color: #1d4ed8;
    }
  }

  &--ghost {
    background: #fff;
    border-color: #d1d5db;
    color: #374151;

    &:hover:not(:disabled) {
      background: #f3f4f6;
    }
  }

  &--fetch {
    padding: 6px 10px;
    white-space: nowrap;
  }
}

// —— LLM 设置分区样式 ——
.gs-llm {
  &__input {
    flex: 1;
    padding: 8px 10px;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
    background: #fff;

    &:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }
  }

  &__key-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__key-row {
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__key-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__key-label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  &__key-status {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 10px;
    background: #fee2e2;
    color: #dc2626;

    &--set {
      background: #dcfce7;
      color: #16a34a;
    }
  }

  &__key-input-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  &__actions {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.gs-btn--clear-sm,
.gs-btn--save-sm {
  padding: 4px 10px;
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
}

.gs-btn--saved {
  background: #16a34a !important;
  border-color: #16a34a !important;
  color: #fff;
}

@keyframes gsFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes gsPopIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
