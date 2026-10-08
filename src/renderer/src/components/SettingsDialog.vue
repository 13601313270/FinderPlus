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
import {
  IMAGE_PROVIDERS,
  type ImageProviderId
} from '../../../main/nodePlugin/ImageGenNode/providers'
import { useImageSettings } from '@renderer/composables/useImageSettings'
import { usePaletteSettings } from '@renderer/composables/usePaletteSettings'
import SelectMenu from './SelectMenu.vue'
import { workspaceScene } from '../../../main/engine/graph/SceneRegistry'
import { viewport } from '@renderer/canvas/viewport'
import { paletteManifests } from '../../../main/nodePlugin'
import { resolveNodeTitle } from '../../../main/nodePlugin/manifest'
import { NODE_CATEGORIES, DEFAULT_NODE_CATEGORY, CATEGORY_LABELS, type NodeCategory } from '../../../main/nodePlugin/category'
import { resolveLocalizedText } from '../../../shared/language'

/**
 * 全局设置弹窗：左侧分类栏 + 右侧滚动内容。
 * 三个分组（sidebar nav）：通用 | 大语言模型设置 | 生图模型
 */
const { t } = useI18n()
const { visible, targetSection, openSettings, closeSettings } = useGlobalSettings()
const { language, setLanguage, languageOptions } = useLanguageSettings()
const { restart: restartOnboarding } = useOnboarding()
const {
  initDraft: initLLMDraft,
  draftKeys: llmDraftKeys,
  saveProviderKey: saveLLMProviderKey,
  clearKey: clearLLMKey
} = useLLMSettings()
const {
  initDraft: initImageDraft,
  draftKeys: imageDraftKeys,
  saveProviderKey: saveImageProviderKey,
  clearKey: clearImageKey
} = useImageSettings()
const { hiddenTypes, toggleHidden, showAll } = usePaletteSettings()

/** 左侧选中的分类 */
type SectionKey = 'general' | 'llm' | 'image' | 'nodes' | 'canvases'
const activeSection = ref<SectionKey>('general')

const SECTION_ORDER: SectionKey[] = ['general', 'llm', 'image', 'nodes', 'canvases']

function sectionLabel(key: SectionKey): string {
  switch (key) {
    case 'general':   return t('settingsDialog.groupGeneral')
    case 'llm':       return t('settingsDialog.groupLLM')
    case 'image':     return t('settingsDialog.groupImage')
    case 'nodes':     return t('settingsDialog.groupNodes')
    case 'canvases':  return t('settingsDialog.groupCanvases')
  }
}

/** SettingsDialog 打开时同步初始化 LLM + Image draft，并处理侧边栏聚焦 */
watch(visible, (v) => {
  if (v) {
    initLLMDraft()
    initImageDraft()
    // 调用方可以在 openSettings('nodes') 时指定聚焦 section；否则兜底第一个
    const requested = targetSection.value as SectionKey | null
    activeSection.value = requested && SECTION_ORDER.includes(requested) ? requested : 'general'
  }
})

const llmProviders = Object.entries(LLM_PROVIDERS) as [LLMProvider, typeof LLM_PROVIDERS[LLMProvider]][]
const imageProviders = Object.entries(IMAGE_PROVIDERS) as [ImageProviderId, typeof IMAGE_PROVIDERS[ImageProviderId]][]

/** 重置新手引导：清除 seen 标记并立即弹出 */
function onRestartOnboarding(): void {
  closeSettings()
  restartOnboarding()
}

/** 语言选项 → SelectMenu 需要的 { value, label } */
const languageSelectOptions = computed(() =>
  languageOptions.map((opt) => ({ value: opt.code, label: opt.label }))
)

/**
 * 调色板节点按分类分组，供节点设置页面渲染。
 * 复用 NodePalette 的分类维度和 resolveNodeTitle 本地化逻辑，保证设置页和调色板
 * 显示的分类名、节点名完全一致。
 */
const groupedNodes = computed(() => {
  const rows = paletteManifests.map((m) => ({
    type: m.type,
    label: resolveNodeTitle(m, language.value),
    iconPaths: m.iconPaths ?? [],
    category: (m.category ?? DEFAULT_NODE_CATEGORY) as NodeCategory
  }))
  return NODE_CATEGORIES
    .map((cat) => ({
      category: cat,
      label: resolveLocalizedText(CATEGORY_LABELS[cat], language.value, cat),
      items: rows.filter((r) => r.category === cat)
    }))
    .filter((g) => g.items.length > 0)
})

/** 某个节点 type 当前是否显示（不隐藏）：用于 checkbox 的 v-model */
function isVisible(type: string): boolean {
  return !hiddenTypes.value.has(type)
}

function onToggleNode(type: string, visible: boolean): void {
  toggleHidden(type, !visible)
}

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
  'canvasdesk.tutorialSeen',
  'canvasdesk.palette.hiddenTypes'
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
      await window.showAlert(t('settingsDialog.exportSuccess'))
    } else {
      await window.showAlert(`Export failed: ${result?.error ?? 'Unknown error'}`)
    }
  } catch (err) {
    await window.showAlert(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    transferBusy.value = false
  }
}

/** 导入按钮点击 */
async function handleImport(): Promise<void> {
  // 1. 确认弹窗
  const confirmed = await window.showConfirm(t('settingsDialog.importConfirmTitle'), t('settingsDialog.importConfirmBody'))
  if (!confirmed) return

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
      await window.showAlert(t('settingsDialog.importSuccess'))
      window.location.reload()
      return
    } else {
      await window.showAlert(`Import failed: ${result?.error ?? 'Unknown error'}`)
    }
  } catch (err) {
    await window.showAlert(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    transferBusy.value = false
  }
}

/** 系统应用菜单「设置…」触发的取消订阅句柄 */
let disposeMenuListener: (() => void) | undefined
/** canvas:changed 广播订阅（主进程在其他窗口 create/rename/delete 后 broadcast） */
let unsubscribeCanvasChanged: (() => void) | undefined

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
  // 订阅 Scene 变化，让 canvasIsEmpty computed 能实时响应
  unsubscribeSceneSettings = workspaceScene.onChanged(onSceneTickForSettings)
  // 订阅画布 CRUD 广播，跨窗口同步"我的画布"列表
  unsubscribeCanvasChanged = window.canvasApi.onChanged(() => {
    // 不管当前 section 是什么，收到广播就拉一次—— canvases section 以外也只是空跑一次，不浪费
    void refreshCanvasRows()
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  disposeMenuListener?.()
  unsubscribeSceneSettings?.()
  unsubscribeCanvasChanged?.()
})

// —— LLM 保存反馈 ——
/** 正在显示"已保存"反馈的 provider 集合 */
const savedProviders = ref<Set<LLMProvider>>(new Set())
const savedImageProviders = ref<Set<ImageProviderId>>(new Set())

function onSaveProviderKey(provider: LLMProvider): void {
  saveLLMProviderKey(provider)
  // 短暂显示反馈
  savedProviders.value.add(provider)
  setTimeout(() => {
    savedProviders.value.delete(provider)
  }, 1500)
}

function onSaveImageProviderKey(provider: ImageProviderId): void {
  saveImageProviderKey(provider)
  savedImageProviders.value.add(provider)
  setTimeout(() => {
    savedImageProviders.value.delete(provider)
  }, 1500)
}

// —— 清空画布 ——
/** 让 computed 响应 Scene 结构变化的 tick */
const sceneTick = ref(0)
let unsubscribeSceneSettings: (() => void) | undefined

function onSceneTickForSettings(): void {
  sceneTick.value++
}

/** 画布是否已经是空的（无节点无边） */
const canvasIsEmpty = computed(() => {
  sceneTick.value // 只做依赖登记
  return workspaceScene.allNodes.length === 0 && workspaceScene.allEdges.length === 0
})

const clearBusy = ref(false)

async function handleClearCanvas(): Promise<void> {
  const ok = await window.showConfirm(
    t('settingsDialog.clearConfirmTitle'),
    t('settingsDialog.clearConfirmBody')
  )
  if (!ok) return
  clearBusy.value = true
  try {
    await workspaceScene.clearAll()
    // 顺便把视口也复位
    viewport.x = 0
    viewport.y = 0
    viewport.scale = 1
    closeSettings()
    await window.showAlert(t('settingsDialog.clearSuccess'))
  } catch (err) {
    await window.showAlert(`Clear failed: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    clearBusy.value = false
  }
}

// —— 我的画布 tab ——
interface CanvasRow {
  id: string
  name: string
  updatedAt: number
  nodeCount: number
  edgeCount: number
  fileCount: number
}
const canvasRows = ref<CanvasRow[]>([])
const canvasLoading = ref(false)
const currentCanvasId = window.getCurrentCanvasId()

async function refreshCanvasRows(): Promise<void> {
  canvasLoading.value = true
  try {
    const list = await window.canvasApi.list()
    const ids = list.map((c) => c.id)
    const details = await window.canvasApi.details(ids)
    canvasRows.value = list.map((c) => {
      const d = details[c.id] ?? { nodeCount: 0, edgeCount: 0, fileCount: 0 }
      return { ...c, ...d }
    })
  } catch (err) {
    console.warn('[settings] 加载画布列表失败', err)
  } finally {
    canvasLoading.value = false
  }
}

// 打开设置弹窗时刷新画布列表
watch(activeSection, (key) => {
  if (key === 'canvases') void refreshCanvasRows()
})
watch(visible, (v) => {
  if (v && activeSection.value === 'canvases') void refreshCanvasRows()
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 给卡片左侧缩略图随机一个渐变背景——基于 canvasId 哈希保证稳定
const THUMB_GRADIENTS = [
  'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
  'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
  'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
  'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
  'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
  'linear-gradient(135deg,#a8edea 0%,#fed6e3 100%)',
  'linear-gradient(135deg,#ff9a9e 0%,#fad0c4 100%)',
  'linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)',
]
function canvasThumbBg(row: CanvasRow): { background: string } {
  let h = 0
  for (let i = 0; i < row.id.length; i++) h = ((h << 5) - h + row.id.charCodeAt(i)) | 0
  return { background: THUMB_GRADIENTS[Math.abs(h) % THUMB_GRADIENTS.length] }
}

async function onOpenCanvas(id: string): Promise<void> {
  await window.canvasApi.openNewWindow(id)
}

async function onOpenCanvasFolder(id: string): Promise<void> {
  await window.canvasApi.openFolder(id)
}

async function onRenameCanvas(id: string, currentName: string): Promise<void> {
  const input = await window.showPrompt(t('settingsDialog.canvasRenamePrompt'), currentName)
  if (!input || !input.trim() || input === currentName) return
  const result = await window.canvasApi.rename(id, input.trim())
  if (!result.ok) {
    await window.showAlert(result.error ?? t('settingsDialog.canvasRenameFailed'))
    return
  }
  await refreshCanvasRows()
}

async function onDeleteCanvas(id: string, name: string): Promise<void> {
  // 只有一个画布 → 不清空 canvases 表（会导致 list() 无数据），只清 nodes/edges
  const list = await window.canvasApi.list()
  if (list.length <= 1) {
    const ok = await window.showConfirm(
      t('settingsDialog.canvasOnlyOneTitle'),
      t('settingsDialog.canvasOnlyOneBody', { name })
    )
    if (!ok) return
    await workspaceScene.clearAll()
    // 顺便把视口也复位
    viewport.x = 0
    viewport.y = 0
    viewport.scale = 1
    closeSettings()
    return
  }

  // 多个画布 → 正常删除
  const ok = await window.showConfirm(
    t('settingsDialog.canvasDeleteConfirmTitle'),
    t('settingsDialog.canvasDeleteConfirmBody', { name })
  )
  if (!ok) return
  const result = await window.canvasApi.delete(id)
  if (!result.ok) {
    await window.showAlert(result.error ?? t('settingsDialog.canvasDeleteFailed'))
    return
  }
  await refreshCanvasRows()
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
          <!-- 左侧分类栏 -->
          <nav class="gs-sidebar">
            <button
              v-for="key in SECTION_ORDER"
              :key="key"
              class="gs-sidebar__item"
              :class="{ 'gs-sidebar__item--active': activeSection === key }"
              type="button"
              @click="activeSection = key"
            >
              {{ sectionLabel(key) }}
            </button>
          </nav>

          <!-- 右侧内容区 -->
          <div class="gs-content">
            <!-- ========== 通用 ========== -->
            <template v-if="activeSection === 'general'">
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

              <section class="gs-section">
                <h4 class="gs-section__title">{{ t('settingsDialog.clearSection') }}</h4>
                <p class="gs-section__hint">{{ t('settingsDialog.clearHint') }}</p>
                <div class="gs-transfer__actions">
                  <button
                    class="gs-btn"
                    type="button"
                    :disabled="clearBusy || canvasIsEmpty"
                    @click="handleClearCanvas"
                  >{{ t('settingsDialog.clearButton') }}</button>
                  <span v-if="canvasIsEmpty" class="gs-clear__empty">{{ t('settingsDialog.clearAlreadyEmpty') }}</span>
                </div>
              </section>
            </template>

            <!-- ========== 大语言模型设置 ========== -->
            <template v-if="activeSection === 'llm'">
              <section class="gs-section">
                <h4 class="gs-section__title">{{ t('settingsDialog.llmTitle') }}</h4>
                <p class="gs-section__hint">{{ t('settingsDialog.llmHint') }}</p>

                <div class="gs-llm__key-list">
                  <div
                    v-for="[key, preset] in llmProviders"
                    :key="key"
                    class="gs-llm__key-row"
                  >
                    <div class="gs-llm__key-header">
                      <span class="gs-llm__key-label">{{ preset.label }}</span>
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
                      >{{ t('settingsDialog.clear') }}</button>
                      <button
                        class="gs-btn gs-btn--primary gs-btn--save-sm"
                        :class="{ 'gs-btn--saved': savedProviders.has(key) }"
                        type="button"
                        @click="onSaveProviderKey(key)"
                      >{{ savedProviders.has(key) ? t('settingsDialog.saved') : t('settingsDialog.save') }}</button>
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ========== 生图模型 ========== -->
            <template v-if="activeSection === 'image'">
              <section class="gs-section">
                <h4 class="gs-section__title">{{ t('settingsDialog.imageTitle') }}</h4>
                <p class="gs-section__hint">{{ t('settingsDialog.imageHint') }}</p>

                <div class="gs-llm__key-list">
                  <div
                    v-for="[key, preset] in imageProviders"
                    :key="key"
                    class="gs-llm__key-row"
                  >
                    <div class="gs-llm__key-header">
                      <span class="gs-llm__key-label">{{ preset.label }}</span>
                    </div>
                    <div class="gs-llm__key-input-row">
                      <input
                        v-model="imageDraftKeys[key]"
                        class="gs-llm__input"
                        type="password"
                        :placeholder="`${preset.label} API Key`"
                        autocomplete="off"
                        spellcheck="false"
                      />
                      <button
                        class="gs-btn gs-btn--ghost gs-btn--clear-sm"
                        type="button"
                        :disabled="!imageDraftKeys[key]"
                        @click="clearImageKey(key)"
                      >{{ t('settingsDialog.clear') }}</button>
                      <button
                        class="gs-btn gs-btn--primary gs-btn--save-sm"
                        :class="{ 'gs-btn--saved': savedImageProviders.has(key) }"
                        type="button"
                        @click="onSaveImageProviderKey(key)"
                      >{{ savedImageProviders.has(key) ? t('settingsDialog.saved') : t('settingsDialog.save') }}</button>
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ========== 节点调色板 ========== -->
            <template v-if="activeSection === 'nodes'">
              <section class="gs-section">
                <h4 class="gs-section__title">{{ t('settingsDialog.nodesTitle') }}</h4>
                <p class="gs-section__hint">{{ t('settingsDialog.nodesHint') }}</p>
                <p class="gs-section__hint">{{ t('settingsDialog.nodesHiddenCount', { count: hiddenTypes.size }) }}</p>

                <div class="gs-transfer__actions" style="margin-bottom: 12px;">
                  <button
                    class="gs-btn"
                    type="button"
                    @click="showAll()"
                  >{{ t('settingsDialog.nodesShowAll') }}</button>
                </div>

                <div class="gs-nodes__groups">
                  <div v-for="group in groupedNodes" :key="group.category" class="gs-nodes__group">
                    <div class="gs-nodes__group-title">{{ group.label }}</div>
                    <div class="gs-nodes__grid">
                      <label
                        v-for="item in group.items"
                        :key="item.type"
                        class="gs-nodes__tile"
                        :class="{ 'gs-nodes__tile--hidden': !isVisible(item.type) }"
                      >
                        <input
                          type="checkbox"
                          :checked="isVisible(item.type)"
                          class="gs-nodes__checkbox"
                          @change="onToggleNode(item.type, ($event.target as HTMLInputElement).checked)"
                        />
                        <svg
                          v-if="item.iconPaths.length"
                          class="gs-nodes__icon"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          aria-hidden="true"
                        >
                          <path v-for="(d, i) in item.iconPaths" :key="i" :d="d" />
                        </svg>
                        <span class="gs-nodes__tile-label">{{ item.label }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ========== 我的画布 ========== -->
            <template v-if="activeSection === 'canvases'">
              <section class="gs-section">
                <h4 class="gs-section__title">{{ t('settingsDialog.canvasesTitle') }}</h4>
                <p class="gs-section__hint">{{ t('settingsDialog.canvasesHint') }}</p>

                <div v-if="canvasLoading" class="gs-canvases__loading">{{ t('settingsDialog.canvasesLoading') }}</div>

                <div v-else-if="canvasRows.length === 0" class="gs-canvases__empty">
                  {{ t('settingsDialog.canvasesEmpty') }}
                </div>

                <div v-else class="gs-canvases__grid">
                  <div
                    v-for="row in canvasRows"
                    :key="row.id"
                    class="gs-canvas-card"
                    :class="{ 'gs-canvas-card--active': row.id === currentCanvasId }"
                  >
                    <!-- 第一行：缩略图 + 信息 -->
                    <div class="gs-canvas-card__row">
                      <div class="gs-canvas-card__thumb" :style="canvasThumbBg(row)">
                        <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="18" cy="22" r="7" fill="#fff" fill-opacity="0.9"/>
                          <circle cx="42" cy="22" r="7" fill="#fff" fill-opacity="0.9"/>
                          <circle cx="30" cy="42" r="7" fill="#fff" fill-opacity="0.9"/>
                          <path d="M25 22 H35" stroke="#fff" stroke-opacity="0.7" stroke-width="2"/>
                          <path d="M20 28 L28 36" stroke="#fff" stroke-opacity="0.7" stroke-width="2"/>
                          <path d="M40 28 L32 36" stroke="#fff" stroke-opacity="0.7" stroke-width="2"/>
                        </svg>
                      </div>
                      <div class="gs-canvas-card__info">
                        <div class="gs-canvas-card__name-row">
                          <span class="gs-canvas-card__name">{{ row.name }}</span>
                          <span v-if="row.id === 'default'" class="gs-canvas-card__badge">{{ t('settingsDialog.canvasBadgeDefault') }}</span>
                          <span v-if="row.id === currentCanvasId" class="gs-canvas-card__badge gs-canvas-card__badge--active">{{ t('settingsDialog.canvasBadgeCurrent') }}</span>
                        </div>
                        <div class="gs-canvas-card__stats">
                          <span class="gs-canvas-card__stat"><b>{{ row.nodeCount }}</b> {{ t('settingsDialog.canvasNodeStat') }}</span>
                          <span class="gs-canvas-card__stat"><b>{{ row.edgeCount }}</b> {{ t('settingsDialog.canvasEdgeStat') }}</span>
                          <span class="gs-canvas-card__stat"><b>{{ row.fileCount }}</b> {{ t('settingsDialog.canvasFileStat') }}</span>
                          <span class="gs-canvas-card__time">{{ t('settingsDialog.canvasLastModified') }}: {{ formatTime(row.updatedAt) }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- 第二行：操作按钮 -->
                    <div class="gs-canvas-card__actions">
                      <button class="gs-canvas-card__btn gs-canvas-card__btn--primary" type="button" @click="onOpenCanvas(row.id)">{{ t('settingsDialog.canvasBtnOpen') }}</button>
                      <button class="gs-canvas-card__btn" type="button" @click="onOpenCanvasFolder(row.id)">{{ t('settingsDialog.canvasBtnOpenFolder') }}</button>
                      <button class="gs-canvas-card__btn" type="button" @click="onRenameCanvas(row.id, row.name)">{{ t('settingsDialog.canvasBtnRename') }}</button>
                      <button
                        class="gs-canvas-card__btn gs-canvas-card__btn--danger"
                        type="button"
                        @click="onDeleteCanvas(row.id, row.name)"
                      >{{ t('settingsDialog.canvasBtnDelete') }}</button>
                    </div>
                  </div>
                </div>
              </section>
            </template>
          </div>
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
  width: 700px;
  height: 80vh;
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
    min-height: 0;
    display: flex;
  }
}

// —— 左侧分类栏 ——
.gs-sidebar {
  flex-shrink: 0;
  width: 160px;
  padding: 12px 0;
  border-right: 1px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__item {
    all: unset;
    cursor: pointer;
    padding: 8px 16px;
    font-size: 13px;
    color: #374151;
    transition: background 0.15s, color 0.15s;
    border-left: 2px solid transparent;

    &:hover {
      background: #eef2ff;
    }

    &--active {
      background: #eff6ff;
      color: #2563eb;
      font-weight: 600;
      border-left-color: #2563eb;
    }
  }
}

// —— 右侧内容区 ——
.gs-content {
  flex: 1;
  min-width: 0;
  padding: 16px 20px;
  overflow-y: auto;
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

.gs-btn--saved {
  background: #16a34a !important;
  border-color: #16a34a !important;
  color: #fff;
}

// —— 我的画布 tab 样式（卡片） ——
.gs-canvases {
  &__loading,
  &__empty {
    padding: 28px;
    text-align: center;
    color: #9ca3af;
    font-size: 13px;
    border: 1px dashed #d1d5db;
    border-radius: 10px;
    background: #fafafa;
  }

  &__grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}

// —— 节点调色板设置样式（grid 瓦片） ——
.gs-nodes {
  &__groups {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  &__group {
    padding: 10px 12px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
  }

  &__group-title {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 8px;
  }

  &__tile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px 6px 8px;
    min-height: 64px;
    border-radius: 8px;
    border: 1px solid #dedede;
    background: #fff;
    font-size: 12px;
    color: #1f2937;
    cursor: pointer;
    transition: background 0.1s ease, color 0.1s ease, border-color 0.1s ease, opacity 0.15s ease;

    &:hover {
      background: #eef1f5;
      border-color: #2563eb;
      color: #2563eb;

      .gs-nodes__icon {
        color: #2563eb;
      }
    }

    &--hidden {
      opacity: 0.45;

      .gs-nodes__icon {
        color: #9ca3af;
      }
    }
  }

  &__checkbox {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 14px;
    height: 14px;
    accent-color: #2563eb;
    cursor: pointer;
  }

  &__icon {
    width: 20px;
    height: 20px;
    color: #8a919c;
    transition: color 0.1s ease;
  }

  &__tile-label {
    max-width: 100%;
    line-height: 1.2;
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.gs-canvas-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;

  &:hover {
    border-color: #c7d2fe;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
  }

  &--active {
    border-color: #4f46e5;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);

    .gs-canvas-card__thumb {
      box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.4);
    }
  }

  // 第一行：缩略图 + 信息（横向）
  &__row {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  // 缩略图
  &__thumb {
    flex-shrink: 0;
    width: 52px;
    height: 52px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    svg {
      width: 36px;
      height: 36px;
    }
  }

  // 中间信息
  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__name-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__badge {
    flex-shrink: 0;
    padding: 1px 7px;
    font-size: 10px;
    font-weight: 500;
    color: #2563eb;
    background: #eff6ff;
    border-radius: 4px;

    &--active {
      color: #fff;
      background: #4f46e5;
    }
  }

  &__stats {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #6b7280;

    b {
      color: #374151;
      font-weight: 600;
      margin-right: 2px;
    }
  }

  &__time {
    color: #9ca3af;
    font-variant-numeric: tabular-nums;
  }

  // 第二行：按钮（左对齐）
  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid #f3f4f6;
  }

  &__btn {
    all: unset;
    cursor: pointer;
    padding: 6px 14px;
    font-size: 12px;
    border-radius: 6px;
    color: #4b5563;
    background: #f9fafb;
    border: 1px solid transparent;
    transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;

    &:hover {
      background: #eef2ff;
      color: #4f46e5;
      border-color: #c7d2fe;
    }

    &--primary {
      background: #4f46e5;
      color: #fff;
      border-color: #4f46e5;

      &:hover {
        background: #4338ca;
        color: #fff;
        border-color: #4338ca;
      }
    }

    &--danger {
      color: #dc2626;
      &:hover {
        background: #fef2f2;
        color: #b91c1c;
        border-color: #fecaca;
      }
    }
  }
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
