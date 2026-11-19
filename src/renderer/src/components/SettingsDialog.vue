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
  AI_PROVIDERS,
  loadAiGlobalConfig,
  saveAiGlobalConfig,
  type AiProviderId
} from '../../../shared/aiProviders'
import { usePaletteSettings } from '@renderer/composables/usePaletteSettings'
import { useThemeSettings } from '@renderer/composables/useThemeSettings'
import {
  useBrowserIdentities,
  type BrowserIdentity
} from '@renderer/composables/useBrowserIdentities'
import {
  useFeishuBots,
  type FeishuBot
} from '@renderer/composables/useFeishuBots'
import {
  useOssBuckets,
  type OssBucket
} from '@renderer/composables/useOssBuckets'
import SelectMenu from './SelectMenu.vue'
import { workspaceScene } from '../../../main/engine/graph/SceneRegistry'
import { viewport } from '@renderer/canvas/viewport'
import { paletteManifests } from '../../../main/nodePlugin'
import { resolveNodeTitle } from '../../../main/nodePlugin/manifest'
import { NODE_CATEGORIES, DEFAULT_NODE_CATEGORY, CATEGORY_LABELS, type NodeCategory } from '../../../main/nodePlugin/category'
import { resolveLocalizedText } from '../../../shared/language'
import { BrowserNode } from '../../../main/nodePlugin/BrowserNode/node'

/**
 * 全局设置弹窗：左侧分类栏 + 右侧滚动内容。
 * 主要分组（sidebar nav）：通用 | 外观 | AI 服务配置 | 本地模型 | ...
 * 大语言模型设置 + 生图模型设置 已合并为 统一的 AI 服务配置（canvasdesk.ai.config）。
 */
const { t } = useI18n()
const { visible, targetSection, openSettings, closeSettings } = useGlobalSettings()
const { language, setLanguage, languageOptions } = useLanguageSettings()
const { restart: restartOnboarding } = useOnboarding()

/** 统一的 AI 配置草稿（canvasdesk.ai.config） */
const aiDraftKeys = ref<Record<AiProviderId, string>>({} as Record<AiProviderId, string>)
const aiKeyVisible = ref<Record<string, boolean>>({})

function toggleAIKeyVisible(key: string): void {
  aiKeyVisible.value[key] = !aiKeyVisible.value[key]
}

function clearAIKey(key: AiProviderId): void {
  aiDraftKeys.value = { ...aiDraftKeys.value, [key]: '' }
}

function loadAIDraft(): void {
  const cfg = loadAiGlobalConfig()
  const fresh: Partial<Record<AiProviderId, string>> = {}
  for (const p of Object.keys(AI_PROVIDERS) as AiProviderId[]) {
    fresh[p] = cfg.providers[p]?.key ?? ''
  }
  aiDraftKeys.value = fresh as Record<AiProviderId, string>
}

function saveAIDraft(): void {
  console.log('[SettingsDialog] saveAIDraft called, aiDraftKeys=', JSON.stringify(aiDraftKeys.value, (_, v) => typeof v === 'string' && v.length > 6 ? v.slice(0, 3) + '...' : v))
  const cfg = loadAiGlobalConfig()
  for (const p of Object.keys(AI_PROVIDERS) as AiProviderId[]) {
    cfg.providers[p].key = aiDraftKeys.value[p]?.trim() ?? ''
  }
  saveAiGlobalConfig(cfg)
  console.log('[SettingsDialog] saveAIDraft done, cfg.providers=', JSON.stringify(cfg.providers, (_, v) => typeof v === 'string' && v.length > 6 ? v.slice(0, 3) + '...' : v))
}
const { hiddenTypes, toggleHidden, showAll } = usePaletteSettings()
const { theme, resetTheme } = useThemeSettings()
const {
  identities: browserIdentities,
  add: addBrowserIdentity,
  rename: renameBrowserIdentity,
  remove: removeBrowserIdentity
} = useBrowserIdentities()
const {
  bots: feishuBots,
  add: addFeishuBot,
  update: updateFeishuBot,
  remove: removeFeishuBot
} = useFeishuBots()
const {
  buckets: ossBuckets,
  add: addOssBucket,
  update: updateOssBucket,
  remove: removeOssBucket,
} = useOssBuckets()

/** 左侧选中的分类 */
type SectionKey = 'general' | 'appearance' | 'ai' | 'localAI' | 'nodes' | 'browser' | 'feishu' | 'oss' | 'canvases'
const activeSection = ref<SectionKey>('general')

/** 本地AI模型内部 tab：'llm' = 大语言模型，'image' = 文生图 */
const localAITab = ref<'llm' | 'image'>('llm')

const SECTION_ORDER: SectionKey[] = ['general', 'appearance', 'ai', 'localAI', 'nodes', 'browser', 'feishu', 'oss', 'canvases']

function sectionLabel(key: SectionKey): string {
  switch (key) {
    case 'general':    return t('settingsDialog.groupGeneral')
    case 'appearance': return t('settingsDialog.groupAppearance')
    case 'ai':         return t('settingsDialog.groupCloudAI')
    case 'localAI':    return '本地AI模型'
    case 'nodes':      return t('settingsDialog.groupNodes')
    case 'browser':    return t('settingsDialog.groupBrowser')
    case 'feishu':     return '飞书机器人'
    case 'oss':        return 'OSS Bucket'
    case 'canvases':   return t('settingsDialog.groupCanvases')
  }
}
watch(visible, (v) => {
  if (v) {
    loadAIDraft()
    // 兼容旧的 targetSection：localLLM / localImage → 统一路由到 localAI 并设子 tab
    const rawRequested = targetSection.value as string | null
    if (rawRequested === 'localLLM' || rawRequested === 'localImage') {
      localAITab.value = rawRequested === 'localImage' ? 'image' : 'llm'
      activeSection.value = 'localAI'
    } else {
      const requested = rawRequested as SectionKey | null
      activeSection.value = requested && SECTION_ORDER.includes(requested) ? requested : 'general'
    }
  } else {
    // 关闭时重置密钥明文显示状态，避免下次打开意外泄露
    aiKeyVisible.value = {}
  }
})

/** 云端 AI 服务商列表（过滤掉不需要 API Key 的 provider，比如本地模型） */
const aiProviders = (Object.entries(AI_PROVIDERS) as [AiProviderId, typeof AI_PROVIDERS[AiProviderId]][])
  .filter(([, preset]) => preset.requiresKey)

/** 能力标签显示名 */
const CAPABILITY_LABEL: Record<string, string> = {
  llm: 'LLM',
  image: '生图',
  tts: '文生音频',
  stt: '语音识别'
}

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
    iconImage: m.iconImage,
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
  'canvasdesk.ai.config',
  'canvasdesk.tutorialSeen',
  'canvasdesk.palette.hiddenTypes'
]

/**
 * 把一个 JSON 字符串里的所有 API Key 字段置空。
 * - AI 统一配置：providers[*].key
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

// —— AI 配置自动保存（输入即保存，debounce 300ms） ——
let aiSaveTimer: ReturnType<typeof setTimeout> | null = null
const aiSaveState = ref<'idle' | 'saving' | 'saved'>('idle')
watch(aiDraftKeys, () => {
  aiSaveState.value = 'idle'
  if (aiSaveTimer) clearTimeout(aiSaveTimer)
  aiSaveTimer = setTimeout(() => {
    aiSaveState.value = 'saving'
    saveAIDraft()
    aiSaveState.value = 'saved'
    clearTimeout(aiSaveTimer!)
    aiSaveTimer = null
    // 1.2s 后回到 idle
    setTimeout(() => { aiSaveState.value = 'idle' }, 1200)
  }, 300)
}, { deep: true })

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

// —— 浏览器身份 section ——

/** 查找当前画布上引用了某个身份 id 的所有浏览器节点 */
function findNodesUsingIdentity(id: string): BrowserNode[] {
  return workspaceScene.allNodes.filter(
    (n): n is BrowserNode => n instanceof BrowserNode && n.currentIdentityId === id
  )
}

/** 新增浏览器身份 */
async function onAddBrowserIdentity(): Promise<void> {
  const name = await window.showPrompt(
    t('settingsDialog.browserAddPrompt'),
    ''
  )
  if (!name || !name.trim()) return
  addBrowserIdentity(name.trim())
}

/** 重命名浏览器身份 */
async function onRenameBrowserIdentity(identity: BrowserIdentity): Promise<void> {
  const name = await window.showPrompt(
    t('settingsDialog.browserRenamePrompt'),
    identity.name
  )
  if (!name || !name.trim() || name.trim() === identity.name) return
  renameBrowserIdentity(identity.id, name.trim())
}

/**
 * 删除浏览器身份：
 * 1. 查找引用该身份的节点
 * 2. 二次确认（有节点用 → 告知数量并确认降级；无节点 → 直接确认删除）
 * 3. 删除身份
 * 4. 把所有引用节点切回独立模式（降级）
 */
async function onDeleteBrowserIdentity(identity: BrowserIdentity): Promise<void> {
  const usingNodes = findNodesUsingIdentity(identity.id)

  const title = t('settingsDialog.browserDeleteConfirmTitle', { name: identity.name })
  const body = usingNodes.length > 0
    ? t('settingsDialog.browserDeleteConfirmBodyWithNodes', {
        count: usingNodes.length,
        name: identity.name
      })
    : t('settingsDialog.browserDeleteConfirmBody', { name: identity.name })

  const ok = await window.showConfirm(title, body)
  if (!ok) return

  // 先降级：把所有引用节点切回独立模式
  for (const node of usingNodes) {
    node.setIdentity(undefined)
  }
  // 再删身份定义
  removeBrowserIdentity(identity.id)
}

// —— 飞书机器人 ——
interface FeishuBotDraft {
  mode: 'add' | 'edit'
  id?: string
  name: string
  appId: string
  appSecret: string
}
const feishuBotModalVisible = ref(false)
const feishuBotDraft = ref<FeishuBotDraft>({ mode: 'add', name: '', appId: '', appSecret: '' })
const feishuSecretVisible = ref(false)

function showFeishuBotModal(mode: 'add' | 'edit', bot?: FeishuBot): void {
  if (mode === 'edit' && bot) {
    feishuBotDraft.value = {
      mode: 'edit',
      id: bot.id,
      name: bot.name,
      appId: bot.appId,
      appSecret: bot.appSecret
    }
  } else {
    feishuBotDraft.value = { mode: 'add', name: '', appId: '', appSecret: '' }
  }
  feishuSecretVisible.value = false
  feishuBotModalVisible.value = true
}

function closeFeishuBotModal(): void {
  feishuBotModalVisible.value = false
}

function onSaveFeishuBot(): void {
  const d = feishuBotDraft.value
  if (!d.name.trim() || !d.appId.trim() || !d.appSecret.trim()) return
  if (d.mode === 'add') {
    addFeishuBot(d.name, d.appId, d.appSecret)
  } else if (d.id) {
    updateFeishuBot(d.id, { name: d.name, appId: d.appId, appSecret: d.appSecret })
  }
  feishuBotModalVisible.value = false
}

async function onDeleteFeishuBot(bot: FeishuBot): Promise<void> {
  const ok = await window.showConfirm(
    '删除机器人',
    `确定要删除机器人"${bot.name}"吗？删除后，引用该机器人的节点将无法发送/接收消息（节点里的 botId 配置保留，但凭证不再生效）。`
  )
  if (!ok) return
  removeFeishuBot(bot.id)
}

// —— OSS Bucket ——
interface OssBucketDraft {
  mode: 'add' | 'edit'
  id?: string
  name: string
  accessKeyId: string
  accessKeySecret: string
  region: string
  bucket: string
  endpoint: string
}
const ossBucketModalVisible = ref(false)
const ossBucketDraft = ref<OssBucketDraft>({
  mode: 'add', name: '', accessKeyId: '', accessKeySecret: '', region: '', bucket: '', endpoint: ''
})
const ossSecretVisible = ref(false)

function showOssBucketModal(mode: 'add' | 'edit', bucket?: OssBucket): void {
  if (mode === 'edit' && bucket) {
    ossBucketDraft.value = {
      mode: 'edit',
      id: bucket.id,
      name: bucket.name,
      accessKeyId: bucket.accessKeyId,
      accessKeySecret: bucket.accessKeySecret,
      region: bucket.region,
      bucket: bucket.bucket,
      endpoint: bucket.endpoint
    }
  } else {
    ossBucketDraft.value = { mode: 'add', name: '', accessKeyId: '', accessKeySecret: '', region: '', bucket: '', endpoint: '' }
  }
  ossSecretVisible.value = false
  ossBucketModalVisible.value = true
}

function closeOssBucketModal(): void {
  ossBucketModalVisible.value = false
}

function onSaveOssBucket(): void {
  const d = ossBucketDraft.value
  if (!d.name.trim() || !d.accessKeyId.trim() || !d.accessKeySecret.trim() || !d.region.trim() || !d.bucket.trim()) return
  if (d.mode === 'add') {
    addOssBucket(d.name, d.accessKeyId, d.accessKeySecret, d.region, d.bucket, d.endpoint)
  } else if (d.id) {
    updateOssBucket(d.id, {
      name: d.name, accessKeyId: d.accessKeyId, accessKeySecret: d.accessKeySecret,
      region: d.region, bucket: d.bucket, endpoint: d.endpoint
    })
  }
  ossBucketModalVisible.value = false
}

async function onDeleteOssBucket(bucket: OssBucket): Promise<void> {
  const ok = await window.showConfirm(
    '删除 Bucket',
    `确定要删除 Bucket"${bucket.name}"吗？删除后，引用该 Bucket 的 OSS 节点将无法正常工作（节点里的 bucketId 配置保留，但凭证不再生效）。`
  )
  if (!ok) return
  removeOssBucket(bucket.id)
}

// —— 本地 LLM 模型 section ——

interface LocalModelInfo {
  name: string
  path: string
  size: number
  sizeHuman: string
}
interface RecommendedModel {
  id: string
  label: string
  sizeGb: number
  ramGb: number
  fileName: string
}

const localModels = ref<LocalModelInfo[]>([])
const localLoaded = ref<string[]>([])  // 多模型：已加载的模型文件名数组
const localBusy = ref(false)
const recommendedModels = ref<RecommendedModel[]>([])
const downloadingId = ref<string | null>(null)
const downloadProgress = ref(0)
const downloadProgressText = ref('')

/** 合并后的模型列表：推荐模型做 base + 已安装但不在推荐里的兜底 */
const mergedModels = computed(() => {
  type MergedItem = {
    uniqueKey: string
    label: string
    subtitle: string
    recommendedId?: string
    installedName?: string
    isInstalled: boolean
    loaded: boolean
    isDownloading: boolean
  }

  const recommendedFileNames = new Set(recommendedModels.value.map(r => r.fileName))
  const items: MergedItem[] = []

  // 1) 推荐模型（含下载/安装状态）
  for (const r of recommendedModels.value) {
    const installed = localModels.value.find(m => m.name === r.fileName)
    const loaded = installed ? localLoaded.value.includes(installed.name) : false
    items.push({
      uniqueKey: `rec:${r.id}`,
      label: r.label,
      subtitle: installed
        ? `${installed.sizeHuman}`
        : `约 ${r.sizeGb}GB 磁盘 · 建议 ${r.ramGb}GB 内存`,
      recommendedId: r.id,
      installedName: installed?.name,
      isInstalled: !!installed,
      loaded,
      isDownloading: downloadingId.value === r.id
    })
  }

  // 2) 已安装但不在推荐里的（兜底，比如用户手动放进 models 目录的 GGUF）
  for (const m of localModels.value) {
    if (recommendedFileNames.has(m.name)) continue // 上面已覆盖
    const loaded = localLoaded.value.includes(m.name)
    items.push({
      uniqueKey: `inst:${m.name}`,
      label: m.name,
      subtitle: m.sizeHuman,
      installedName: m.name,
      isInstalled: true,
      loaded,
      isDownloading: false
    })
  }

  return items
})
const localModelsLoading = ref(false)

// ================ 本地文生图模型（和上面 LLM 对称）================
interface LocalImageModelInfo {
  name: string; path: string; size: number; sizeHuman: string
}
interface RecommendedImageModel {
  id: string; label: string; sizeGb: number; ramGb: number; fileName: string; description?: string
}
const localImageModels = ref<LocalImageModelInfo[]>([])
const localImageLoaded = ref<string[]>([])
const localImageBusy = ref(false)
const recommendedImageModels = ref<RecommendedImageModel[]>([])
const imageModelsLoading = ref(false)

const mergedImageModels = computed(() => {
  type Item = {
    uniqueKey: string; label: string; subtitle: string; description?: string
    recommendedId?: string; installedName?: string; isInstalled: boolean; loaded: boolean; isDownloading: boolean
  }
  const recFiles = new Set(recommendedImageModels.value.map(r => r.fileName))
  const items: Item[] = []
  for (const r of recommendedImageModels.value) {
    const installed = localImageModels.value.find(m => m.name === r.fileName)
    const loaded = installed ? localImageLoaded.value.includes(installed.name) : false
    items.push({
      uniqueKey: `rec-img:${r.id}`, label: r.label, description: r.description,
      subtitle: installed ? `${installed.sizeHuman}` : `约 ${r.sizeGb}GB 磁盘 · 建议 ${r.ramGb}GB 内存`,
      recommendedId: r.id, installedName: installed?.name,
      isInstalled: !!installed, loaded, isDownloading: downloadingId.value === `img:${r.id}`
    })
  }
  for (const m of localImageModels.value) {
    if (recFiles.has(m.name)) continue
    const loaded = localImageLoaded.value.includes(m.name)
    items.push({
      uniqueKey: `inst-img:${m.name}`, label: m.name, subtitle: m.sizeHuman,
      installedName: m.name, isInstalled: true, loaded, isDownloading: false
    })
  }
  return items
})

async function refreshLocalImageModels(): Promise<void> {
  imageModelsLoading.value = true
  try {
    const [rec, list] = await Promise.all([
      window.localImageApi?.getRecommendedModels() ?? Promise.resolve([]),
      window.localImageApi?.listModels() ?? Promise.resolve({ loaded: [], busy: false, models: [], activeDownloads: [] as Array<{ id: string; progress: any }> })
    ])
    recommendedImageModels.value = rec
    localImageModels.value = list.models
    localImageLoaded.value = list.loaded
    localImageBusy.value = list.busy

    // 恢复后台下载状态（关闭弹窗再打开时，下载仍在继续）
    if (list.activeDownloads.length > 0) {
      const dl = list.activeDownloads[0]
      downloadingId.value = `img:${dl.id}`
      downloadProgress.value = dl.progress.percent
      if (dl.progress.total) {
        downloadProgressText.value = `${(dl.progress.received / 1024 / 1024).toFixed(0)} / ${(dl.progress.total / 1024 / 1024).toFixed(0)} MB`
      } else {
        downloadProgressText.value = `${(dl.progress.received / 1024 / 1024).toFixed(0)} MB`
      }
      startProgressListener()
    }
  } catch (err) {
    console.warn('[settings] 加载图片模型列表失败', err)
  } finally {
    imageModelsLoading.value = false
  }
}

async function onDownloadImageModel(id: string, source: string = 'hf-mirror'): Promise<void> {
  if (!window.localImageApi) return
  const rec = recommendedImageModels.value.find(m => m.id === id)
  if (!rec) return

  // 串行下载限制：已有下载在跑 → 提示并引导取消
  if (downloadingId.value && downloadingId.value !== `img:${id}`) {
    await window.showAlert('已有下载任务在进行中', '请先取消当前下载，再开始新的下载。')
    return
  }

  downloadingId.value = `img:${id}`
  downloadProgress.value = 0
  downloadProgressText.value = '连接中...'
  startProgressListener()
  try {
    const result = await window.localImageApi.downloadModel(id, source)
    if (result.ok) {
      await refreshLocalImageModels()
    } else {
      await window.showAlert(`下载失败：${result.error ?? '未知错误'}`)
    }
  } finally {
    downloadingId.value = null
    downloadProgress.value = 0
    downloadProgressText.value = ''
    stopProgressListener()
  }
}

async function onCancelImageDownload(id: string): Promise<void> {
  await window.localImageApi?.cancelDownload(id)
  downloadingId.value = null
  downloadProgress.value = 0
  downloadProgressText.value = ''
}

async function onLoadImageModel(modelName: string): Promise<void> {
  if (!window.localImageApi) return
  const model = localImageModels.value.find(m => m.name === modelName)
  if (!model) return
  const result = await window.localImageApi.loadModel(model.path)
  if (!result.ok) {
    await window.showAlert(`加载失败：${result.error}`)
  }
  await refreshLocalImageModels()
}

async function onUnloadImageModel(modelName: string): Promise<void> {
  const model = localImageModels.value.find(m => m.name === modelName)
  if (!model) return
  await window.localImageApi?.unloadModel(model.path)
  await refreshLocalImageModels()
}

async function onDeleteImageModel(modelName: string): Promise<void> {
  const ok = await window.showConfirm('删除本地图片模型', `确定要删除"${modelName}"吗？删除后需重新下载才能使用。`)
  if (!ok) return
  const result = await window.localImageApi?.deleteModel(modelName)
  if (result && !result.ok) await window.showAlert(`删除失败：${result.error}`)
  await refreshLocalImageModels()
}

// 切到本地AI模型 tab 或在 tab 内切换子 tab 时刷新对应列表
watch([activeSection, localAITab], ([sec, tab]) => {
  if (sec === 'localAI') {
    if (tab === 'image') void refreshLocalImageModels()
    if (tab === 'llm') void refreshLocalModels()
  }
})

let progressUnsubs: Array<() => void> = []

async function refreshLocalModels(): Promise<void> {
  localModelsLoading.value = true
  try {
    const [rec, list] = await Promise.all([
      window.localLlmApi?.getRecommendedModels() ?? Promise.resolve([]),
      window.localLlmApi?.listModels() ?? Promise.resolve({ loaded: [], busy: false, models: [], activeDownloads: [] as Array<{ id: string; progress: any }> })
    ])
    recommendedModels.value = rec
    localModels.value = list.models
    localLoaded.value = list.loaded
    localBusy.value = list.busy

    // 恢复后台下载状态（关闭弹窗再打开时，下载仍在继续）
    if (list.activeDownloads.length > 0) {
      const dl = list.activeDownloads[0]
      downloadingId.value = dl.id  // LLM 不带前缀，直接用 catalog ID
      downloadProgress.value = dl.progress.percent
      if (dl.progress.total) {
        downloadProgressText.value = `${(dl.progress.received / 1024 / 1024).toFixed(0)} / ${(dl.progress.total / 1024 / 1024).toFixed(0)} MB`
      } else {
        downloadProgressText.value = `${(dl.progress.received / 1024 / 1024).toFixed(0)} MB`
      }
      startProgressListener()
    }
  } catch (err) {
    console.warn('[settings] 加载本地模型列表失败', err)
  } finally {
    localModelsLoading.value = false
  }
}

// 统一处理下载进度——不管 LLM 还是 Image，都更新同一个 UI 状态
function handleDownloadProgress(p: { modelId: string; received: number; total: number | null; percent: number }): void {
  // 图片模型的 modelId 带前缀（onDownloadImageModel 里设的是 `img:${id}`），
  // 但 IPC 推送来的 p.modelId 是原始 id。为了区分，用 downloadingId 来匹配。
  // 这里下载是串行的（一次只下一个），所以直接更新就行。
  downloadProgress.value = p.percent
  if (p.total) {
    downloadProgressText.value = `${(p.received / 1024 / 1024).toFixed(0)} / ${(p.total / 1024 / 1024).toFixed(0)} MB`
  } else {
    downloadProgressText.value = `${(p.received / 1024 / 1024).toFixed(0)} MB`
  }
}

function startProgressListener(): void {
  if (progressUnsubs.length > 0) return
  // 同时监听 LLM 和 Image 的下载进度（底层共用同一个下载队列）
  const unsubLLM = window.localLlmApi?.onDownloadProgress(handleDownloadProgress)
  const unsubImg = window.localImageApi?.onDownloadProgress(handleDownloadProgress)
  if (unsubLLM) progressUnsubs.push(unsubLLM)
  if (unsubImg) progressUnsubs.push(unsubImg)
}

function stopProgressListener(): void {
  for (const u of progressUnsubs) u()
  progressUnsubs = []
}

// —— 下载源选择 modal ——
const sourceModalVisible = ref(false)
const sourceModalTargetId = ref<string | null>(null)
const sourceModalTargetType = ref<'llm' | 'image'>('llm')
const selectedSource = ref<'hf-mirror' | 'hf-official'>('hf-mirror')

const DOWNLOAD_SOURCE_OPTIONS = [
  { value: 'hf-mirror' as const, label: '国内镜像（推荐）', hint: 'hf-mirror.com · 大陆直连最快' },
  { value: 'hf-official' as const, label: 'HuggingFace 官方', hint: 'huggingface.co · 需科学上网' }
]

function openSourceSelector(modelId: string, type: 'llm' | 'image' = 'llm'): void {
  sourceModalTargetId.value = modelId
  sourceModalTargetType.value = type
  selectedSource.value = 'hf-mirror' // 默认国内镜像
  sourceModalVisible.value = true
}

function closeSourceSelector(): void {
  sourceModalVisible.value = false
  sourceModalTargetId.value = null
}

async function confirmSourceAndDownload(): Promise<void> {
  const id = sourceModalTargetId.value
  const source = selectedSource.value
  const type = sourceModalTargetType.value
  closeSourceSelector()
  if (!id) return
  if (type === 'image') {
    await onDownloadImageModel(id, source)
  } else {
    await onDownloadLocalModel(id, source)
  }
}

async function onDownloadLocalModel(id: string, source: string = 'hf-mirror'): Promise<void> {
  if (!window.localLlmApi) return
  const rec = recommendedModels.value.find((m) => m.id === id)
  if (!rec) return

  // 串行下载限制：已有下载在跑 → 提示并引导取消
  if (downloadingId.value && downloadingId.value !== id) {
    await window.showAlert('已有下载任务在进行中', '请先取消当前下载，再开始新的下载。')
    return
  }

  downloadingId.value = id
  downloadProgress.value = 0
  downloadProgressText.value = '连接中...'
  startProgressListener()

  try {
    const result = await window.localLlmApi.downloadModel(id, source)
    if (result.ok) {
      // 下载完自动加载到内存？不，让用户自己点"加载"
      await refreshLocalModels()
    } else {
      await window.showAlert(`下载失败：${result.error ?? '未知错误'}`)
    }
  } finally {
    downloadingId.value = null
    downloadProgress.value = 0
    downloadProgressText.value = ''
    stopProgressListener()
  }
}

async function onCancelDownload(id: string): Promise<void> {
  await window.localLlmApi?.cancelDownload(id)
  downloadingId.value = null
  downloadProgress.value = 0
  downloadProgressText.value = ''
}

async function onLoadLocalModel(modelName: string): Promise<void> {
  if (!window.localLlmApi) return
  const model = localModels.value.find((m) => m.name === modelName)
  if (!model) return
  const result = await window.localLlmApi.loadModel(model.path)
  if (!result.ok) {
    await window.showAlert(`加载失败：${result.error}`)
  }
  await refreshLocalModels()
}

async function onUnloadLocalModel(modelName: string): Promise<void> {
  const model = localModels.value.find((m) => m.name === modelName)
  if (!model) return
  await window.localLlmApi?.unloadModel(model.path)
  await refreshLocalModels()
}

async function onDeleteLocalModel(modelName: string): Promise<void> {
  const ok = await window.showConfirm(
    '删除本地模型',
    `确定要删除本地模型"${modelName}"吗？删除后需重新下载才能使用。`
  )
  if (!ok) return
  const result = await window.localLlmApi?.deleteModel(modelName)
  if (result && !result.ok) {
    await window.showAlert(`删除失败：${result.error}`)
  }
  await refreshLocalModels()
}

// 切走本地AI模型 section 时停止下载进度监听
watch(activeSection, (key) => {
  if (key !== 'localAI') stopProgressListener()
})

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

            <!-- ========== 外观 ========== -->
            <template v-if="activeSection === 'appearance'">
              <section class="gs-section">
                <h4 class="gs-section__title">{{ t('settingsDialog.appearanceTitle') }}</h4>
                <p class="gs-section__hint">{{ t('settingsDialog.appearanceHint') }}</p>

                <div class="gs-theme__grid">
                  <label class="gs-theme__item">
                    <span class="gs-theme__label">{{ t('settingsDialog.themeCanvasBg') }}</span>
                    <div class="gs-theme__picker-wrap">
                      <input
                        type="color"
                        class="gs-theme__picker"
                        v-model="theme.canvasBg"
                      />
                      <input
                        type="text"
                        class="gs-theme__hex"
                        v-model="theme.canvasBg"
                      />
                    </div>
                  </label>

                  <label class="gs-theme__item">
                    <span class="gs-theme__label">{{ t('settingsDialog.themeCanvasDot') }}</span>
                    <div class="gs-theme__picker-wrap">
                      <input
                        type="color"
                        class="gs-theme__picker"
                        v-model="theme.canvasDot"
                      />
                      <input
                        type="text"
                        class="gs-theme__hex"
                        v-model="theme.canvasDot"
                      />
                    </div>
                  </label>

                  <label class="gs-theme__item">
                    <span class="gs-theme__label">{{ t('settingsDialog.themeEdgeLine') }}</span>
                    <div class="gs-theme__picker-wrap">
                      <input
                        type="color"
                        class="gs-theme__picker"
                        v-model="theme.edgeLine"
                      />
                      <input
                        type="text"
                        class="gs-theme__hex"
                        v-model="theme.edgeLine"
                      />
                    </div>
                  </label>

                  <label class="gs-theme__item">
                    <span class="gs-theme__label">{{ t('settingsDialog.themeNodeBorder') }}</span>
                    <div class="gs-theme__picker-wrap">
                      <input
                        type="color"
                        class="gs-theme__picker"
                        v-model="theme.nodeBorder"
                      />
                      <input
                        type="text"
                        class="gs-theme__hex"
                        v-model="theme.nodeBorder"
                      />
                    </div>
                  </label>
                </div>

                <div class="gs-transfer__actions" style="margin-top: 12px;">
                  <button
                    class="gs-btn"
                    type="button"
                    @click="resetTheme"
                  >{{ t('settingsDialog.themeReset') }}</button>
                </div>
              </section>
            </template>

            <!-- ========== 云端 AI 服务商（统一后，输入即自动保存） ========== -->
            <template v-if="activeSection === 'ai'">
              <section class="gs-section">
                <h4 class="gs-section__title">{{ t('settingsDialog.groupCloudAI') }}</h4>
                <p class="gs-section__hint">
                  统一管理 LLM / 文生图 / 文生音频 / 语音识别 的服务商 Key。
                  同一服务商只需填一次，所有相关节点都会读取这份配置。输入后自动保存。
                  <span v-if="aiSaveState === 'saving'" style="color:#f59e0b;margin-left:8px;">保存中…</span>
                  <span v-else-if="aiSaveState === 'saved'" style="color:#10b981;margin-left:8px;">已自动保存</span>
                </p>

                <div class="gs-llm__key-list">
                  <div
                    v-for="[key, preset] in aiProviders"
                    :key="key"
                    class="gs-llm__key-row"
                  >
                    <div class="gs-llm__key-header">
                      <span class="gs-llm__key-label">{{ preset.label }}</span>
                      <span class="gs-llm__key-capabilities">
                        <span
                          v-for="cap in preset.capabilities"
                          :key="cap"
                          class="gs-llm__cap-badge"
                        >{{ CAPABILITY_LABEL[cap] ?? cap }}</span>
                      </span>
                    </div>
                    <div class="gs-llm__key-input-row">
                      <div class="gs-llm__input-wrap">
                        <input
                          v-model="aiDraftKeys[key]"
                          class="gs-llm__input"
                          :type="aiKeyVisible[key] ? 'text' : 'password'"
                          :placeholder="`${preset.label} API Key`"
                          autocomplete="off"
                          spellcheck="false"
                        />
                        <button
                          class="gs-llm__eye-btn"
                          type="button"
                          :title="aiKeyVisible[key] ? t('settingsDialog.hideKey') : t('settingsDialog.showKey')"
                          @click.stop="toggleAIKeyVisible(key)"
                        >
                          <svg v-if="aiKeyVisible[key]" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        </button>
                      </div>
                      <button
                        class="gs-btn gs-btn--ghost gs-btn--clear-sm"
                        type="button"
                        :disabled="!aiDraftKeys[key]"
                        @click="clearAIKey(key)"
                      >{{ t('settingsDialog.clear') }}</button>
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
                        <img
                          v-if="item.iconImage"
                          class="gs-nodes__icon"
                          :src="item.iconImage"
                          width="20"
                          height="20"
                          alt=""
                          aria-hidden="true"
                        />
                        <span class="gs-nodes__tile-label">{{ item.label }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ========== 浏览器身份 ========== -->
            <template v-if="activeSection === 'browser'">
              <section class="gs-section">
                <h4 class="gs-section__title">{{ t('settingsDialog.browserTitle') }}</h4>
                <p class="gs-section__hint">{{ t('settingsDialog.browserHint') }}</p>

                <div class="gs-transfer__actions" style="margin-bottom: 12px;">
                  <button
                    class="gs-btn gs-btn--primary"
                    type="button"
                    @click="onAddBrowserIdentity"
                  >+ {{ t('settingsDialog.browserAddBtn') }}</button>
                </div>

                <div v-if="browserIdentities.length === 0" class="gs-canvases__empty">
                  {{ t('settingsDialog.browserEmpty') }}
                </div>

                <div v-else class="gs-browser__list">
                  <div
                    v-for="id in browserIdentities"
                    :key="id.id"
                    class="gs-browser-card"
                  >
                    <div class="gs-browser-card__info">
                      <span class="gs-browser-card__name">{{ id.name }}</span>
                      <span class="gs-browser-card__usage">
                        {{ t('settingsDialog.browserUsage', { count: findNodesUsingIdentity(id.id).length }) }}
                      </span>
                    </div>
                    <div class="gs-browser-card__actions">
                      <button
                        class="gs-canvas-card__btn"
                        type="button"
                        @click="onRenameBrowserIdentity(id)"
                      >{{ t('settingsDialog.browserRenameBtn') }}</button>
                      <button
                        class="gs-canvas-card__btn gs-canvas-card__btn--danger"
                        type="button"
                        @click="onDeleteBrowserIdentity(id)"
                      >{{ t('settingsDialog.browserDeleteBtn') }}</button>
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ========== 飞书机器人 ========== -->
            <template v-if="activeSection === 'feishu'">
              <section class="gs-section">
                <h4 class="gs-section__title">飞书机器人</h4>
                <p class="gs-section__hint">配置飞书开放平台自建应用凭证，节点通过 botId 引用。App Secret 存储在本地浏览器 localStorage。</p>

                <div class="gs-transfer__actions" style="margin-bottom: 12px;">
                  <button
                    class="gs-btn gs-btn--primary"
                    type="button"
                    @click="showFeishuBotModal('add')"
                  >+ 新增机器人</button>
                </div>

                <div v-if="feishuBots.length === 0" class="gs-canvases__empty">
                  暂无机器人，点击上方"新增机器人"按钮添加。
                </div>

                <div v-else class="gs-feishu__list">
                  <div
                    v-for="bot in feishuBots"
                    :key="bot.id"
                    class="gs-feishu-card"
                  >
                    <div class="gs-feishu-card__info">
                      <span class="gs-feishu-card__name">{{ bot.name }}</span>
                      <span class="gs-feishu-card__appid">App ID: {{ bot.appId }}</span>
                    </div>
                    <div class="gs-feishu-card__actions">
                      <button
                        class="gs-canvas-card__btn"
                        type="button"
                        @click="showFeishuBotModal('edit', bot)"
                      >编辑</button>
                      <button
                        class="gs-canvas-card__btn gs-canvas-card__btn--danger"
                        type="button"
                        @click="onDeleteFeishuBot(bot)"
                      >删除</button>
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ========== OSS Bucket ========== -->
            <template v-if="activeSection === 'oss'">
              <section class="gs-section">
                <h4 class="gs-section__title">阿里云 OSS Bucket</h4>
                <p class="gs-section__hint">统一配置 Bucket 凭证，OSS 上传 / 下载 / 存在性检查 节点只需选择 Bucket 即可。AccessKey 存储在本地浏览器 localStorage。</p>

                <div class="gs-transfer__actions" style="margin-bottom: 12px;">
                  <button
                    class="gs-btn gs-btn--primary"
                    type="button"
                    @click="showOssBucketModal('add')"
                  >+ 新增 Bucket</button>
                </div>

                <div v-if="ossBuckets.length === 0" class="gs-canvases__empty">
                  暂无 Bucket，点击上方"新增 Bucket"按钮添加。
                </div>

                <div v-else class="gs-feishu__list">
                  <div
                    v-for="bkt in ossBuckets"
                    :key="bkt.id"
                    class="gs-feishu-card"
                  >
                    <div class="gs-feishu-card__info">
                      <span class="gs-feishu-card__name">{{ bkt.name }}</span>
                      <span class="gs-feishu-card__appid">{{ bkt.bucket }} · {{ bkt.region }}</span>
                    </div>
                    <div class="gs-feishu-card__actions">
                      <button
                        class="gs-canvas-card__btn"
                        type="button"
                        @click="showOssBucketModal('edit', bkt)"
                      >编辑</button>
                      <button
                        class="gs-canvas-card__btn gs-canvas-card__btn--danger"
                        type="button"
                        @click="onDeleteOssBucket(bkt)"
                      >删除</button>
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ========== 本地 AI 模型（LLM + 文生图 合并） ========== -->
            <template v-if="activeSection === 'localAI'">
              <!-- 子 tab 切换 -->
              <section class="gs-section">
                <div class="gs-localai__tabs">
                  <button
                    class="gs-localai__tab"
                    :class="{ 'gs-localai__tab--active': localAITab === 'llm' }"
                    type="button"
                    @click="localAITab = 'llm'"
                  >💬 大语言模型</button>
                  <button
                    class="gs-localai__tab"
                    :class="{ 'gs-localai__tab--active': localAITab === 'image' }"
                    type="button"
                    @click="localAITab = 'image'"
                  >🖼 文生图模型</button>
                </div>
              </section>

              <!-- ===== LLM ===== -->
              <template v-if="localAITab === 'llm'">
                <section class="gs-section">
                  <h4 class="gs-section__title">大语言模型</h4>
                  <p class="gs-section__hint">下载小体积本地大语言模型（1~3B），直接在你的 Mac 上运行推理，无需网络。首次下载后完全离线可用。</p>
                  <p class="gs-section__hint gs-section__hint--warn">下载的模型保存在本地数据目录，不会随应用打包。用完点"停止"可释放内存，磁盘空间可单独删除。</p>
                </section>

                <section class="gs-section">
                  <h4 class="gs-section__title">模型库</h4>

                  <div v-if="localModelsLoading" class="gs-canvases__loading">加载中...</div>

                  <div v-else-if="mergedModels.length === 0" class="gs-canvases__empty">
                    暂无本地模型。
                  </div>

                  <div v-else class="gs-feishu__list">
                    <div
                      v-for="m in mergedModels"
                      :key="m.uniqueKey"
                      class="gs-feishu-card"
                    >
                      <div class="gs-feishu-card__info">
                        <span class="gs-feishu-card__name">
                          {{ m.label }}
                          <span v-if="m.loaded" class="gs-local__loaded-badge">🟢 运行中</span>
                        </span>
                        <span class="gs-feishu-card__appid">{{ m.subtitle }}</span>
                      </div>
                      <div class="gs-feishu-card__actions">
                        <!-- 下载中：进度条 + 取消 -->
                        <template v-if="m.isDownloading">
                          <div class="gs-local__progress">
                            <div class="gs-local__progress-bar" :style="{ width: `${downloadProgress}%` }" />
                            <span class="gs-local__progress-text">{{ downloadProgress.toFixed(0) }}% · {{ downloadProgressText }}</span>
                          </div>
                          <button
                            class="gs-canvas-card__btn gs-canvas-card__btn--danger"
                            type="button"
                            @click="onCancelDownload(m.recommendedId!)"
                          >取消</button>
                        </template>

                        <!-- 已下载：启动/停止 + 删除 -->
                        <template v-else-if="m.isInstalled">
                          <button
                            v-if="!m.loaded"
                            class="gs-canvas-card__btn gs-canvas-card__btn--primary"
                            type="button"
                            :disabled="localBusy"
                            @click="onLoadLocalModel(m.installedName!)"
                          >启动</button>
                          <button
                            v-else
                            class="gs-canvas-card__btn"
                            type="button"
                            :disabled="localBusy"
                            @click="onUnloadLocalModel(m.installedName!)"
                          >停止</button>
                          <button
                            class="gs-canvas-card__btn gs-canvas-card__btn--danger"
                            type="button"
                            :disabled="m.loaded"
                            @click="onDeleteLocalModel(m.installedName!)"
                          >删除</button>
                        </template>

                        <!-- 未下载：下载按钮 -->
                        <template v-else>
                          <button
                            class="gs-canvas-card__btn gs-canvas-card__btn--primary"
                            type="button"
                            @click="openSourceSelector(m.recommendedId!)"
                          >下载</button>
                        </template>
                      </div>
                    </div>
                  </div>
                </section>
              </template>

              <!-- ===== 文生图 ===== -->
              <template v-if="localAITab === 'image'">
                <section class="gs-section">
                  <h4 class="gs-section__title">文生图模型</h4>
                  <p class="gs-section__hint">下载小体积本地文生图模型（GGUF 量化格式），通过 Apple Silicon Metal 加速，直接在你的 Mac 上生成图片，无需网络。</p>
                  <p class="gs-section__hint gs-section__hint--warn">推荐体积 1.8~2.5GB，运行时会占用 3~4GB 内存。首次下载后完全离线可用。用完点"停止"可释放内存。</p>
                </section>

                <section class="gs-section">
                  <h4 class="gs-section__title">模型库</h4>

                  <div v-if="imageModelsLoading" class="gs-canvases__loading">加载中...</div>

                  <div v-else-if="mergedImageModels.length === 0" class="gs-canvases__empty">
                    暂无图片模型。点击下方"下载"按钮开始。
                  </div>

                  <div v-else class="gs-feishu__list">
                    <div
                      v-for="m in mergedImageModels"
                      :key="m.uniqueKey"
                      class="gs-feishu-card"
                    >
                      <div class="gs-feishu-card__info">
                        <span class="gs-feishu-card__name">
                          {{ m.label }}
                          <span v-if="m.loaded" class="gs-local__loaded-badge">🟢 运行中</span>
                        </span>
                        <span class="gs-feishu-card__appid">
                          {{ m.subtitle }}
                          <span v-if="m.description" class="gs-local__desc">· {{ m.description }}</span>
                        </span>
                      </div>
                      <div class="gs-feishu-card__actions">
                        <!-- 下载中：进度条 + 取消 -->
                        <template v-if="m.isDownloading">
                          <div class="gs-local__progress">
                            <div class="gs-local__progress-bar" :style="{ width: `${downloadProgress}%` }" />
                            <span class="gs-local__progress-text">{{ downloadProgress.toFixed(0) }}% · {{ downloadProgressText }}</span>
                          </div>
                          <button
                            class="gs-canvas-card__btn gs-canvas-card__btn--danger"
                            type="button"
                            @click="onCancelImageDownload(m.recommendedId!)"
                          >取消</button>
                        </template>

                        <!-- 已下载：启动/停止 + 删除 -->
                        <template v-else-if="m.isInstalled">
                          <button
                            v-if="!m.loaded"
                            class="gs-canvas-card__btn gs-canvas-card__btn--primary"
                            type="button"
                            :disabled="localImageBusy"
                            @click="onLoadImageModel(m.installedName!)"
                          >启动</button>
                          <button
                            v-else
                            class="gs-canvas-card__btn"
                            type="button"
                            :disabled="localImageBusy"
                            @click="onUnloadImageModel(m.installedName!)"
                          >停止</button>
                          <button
                            class="gs-canvas-card__btn gs-canvas-card__btn--danger"
                            type="button"
                            :disabled="m.loaded"
                            @click="onDeleteImageModel(m.installedName!)"
                          >删除</button>
                        </template>

                        <!-- 未下载：下载按钮 -->
                        <template v-else>
                          <button
                            class="gs-canvas-card__btn gs-canvas-card__btn--primary"
                            type="button"
                            @click="openSourceSelector(m.recommendedId!, 'image')"
                          >下载</button>
                        </template>
                      </div>
                    </div>
                  </div>
                </section>
              </template>
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

          <!-- ========== 飞书机器人编辑 Modal ========== -->
          <Teleport to="body">
            <div v-if="feishuBotModalVisible" class="gs-mask" @click.self="closeFeishuBotModal">
              <div class="gs-modal" @click.stop>
                <div class="gs-modal__header">
                  <span class="gs-modal__title">{{ feishuBotDraft.mode === 'edit' ? '编辑飞书机器人' : '新增飞书机器人' }}</span>
                  <button class="gs-modal__close" type="button" @click="closeFeishuBotModal">×</button>
                </div>
                <div class="gs-modal__body">
                  <label class="gs-field">
                    <span class="gs-field__label">名称</span>
                    <input
                      class="gs-field__input"
                      type="text"
                      v-model="feishuBotDraft.name"
                      placeholder="如：通知群机器人"
                      maxlength="32"
                    />
                  </label>
                  <label class="gs-field">
                    <span class="gs-field__label">App ID</span>
                    <input
                      class="gs-field__input"
                      type="text"
                      v-model="feishuBotDraft.appId"
                      placeholder="cli_xxxxxxxxxxxxxx"
                    />
                  </label>
                  <label class="gs-field">
                    <span class="gs-field__label">App Secret</span>
                    <div class="gs-field__secret-row">
                      <input
                        class="gs-field__input"
                        :type="feishuSecretVisible ? 'text' : 'password'"
                        v-model="feishuBotDraft.appSecret"
                        placeholder="••••••••••••••••••••"
                      />
                      <button
                        class="gs-field__toggle"
                        type="button"
                        @click="feishuSecretVisible = !feishuSecretVisible"
                      >{{ feishuSecretVisible ? '隐藏' : '显示' }}</button>
                    </div>
                  </label>
                </div>
                <div class="gs-modal__footer">
                  <button class="gs-btn" type="button" @click="closeFeishuBotModal">取消</button>
                  <button
                    class="gs-btn gs-btn--primary"
                    type="button"
                    :disabled="!feishuBotDraft.name.trim() || !feishuBotDraft.appId.trim() || !feishuBotDraft.appSecret.trim()"
                    @click="onSaveFeishuBot"
                  >保存</button>
                </div>
              </div>
            </div>
          </Teleport>

          <!-- ========== OSS Bucket 编辑 Modal ========== -->
          <Teleport to="body">
            <div v-if="ossBucketModalVisible" class="gs-mask" @click.self="closeOssBucketModal">
              <div class="gs-modal gs-modal--wide" @click.stop>
                <div class="gs-modal__header">
                  <span class="gs-modal__title">{{ ossBucketDraft.mode === 'edit' ? '编辑 Bucket' : '新增 Bucket' }}</span>
                  <button class="gs-modal__close" type="button" @click="closeOssBucketModal">×</button>
                </div>
                <div class="gs-modal__body">
                  <label class="gs-field">
                    <span class="gs-field__label">名称</span>
                    <input
                      class="gs-field__input"
                      type="text"
                      v-model="ossBucketDraft.name"
                      placeholder="如：生产环境 bucket"
                      maxlength="64"
                    />
                  </label>
                  <div style="display: flex; gap: 8px;">
                    <label class="gs-field" style="flex: 1;">
                      <span class="gs-field__label">AccessKeyId *</span>
                      <input
                        class="gs-field__input"
                        type="text"
                        v-model="ossBucketDraft.accessKeyId"
                        placeholder="LTAI5t..."
                      />
                    </label>
                    <label class="gs-field" style="flex: 1;">
                      <span class="gs-field__label">AccessKeySecret *</span>
                      <div class="gs-field__secret-row">
                        <input
                          class="gs-field__input"
                          :type="ossSecretVisible ? 'text' : 'password'"
                          v-model="ossBucketDraft.accessKeySecret"
                          placeholder="••••••"
                        />
                        <button
                          class="gs-field__toggle"
                          type="button"
                          @click="ossSecretVisible = !ossSecretVisible"
                        >{{ ossSecretVisible ? '隐藏' : '显示' }}</button>
                      </div>
                    </label>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <label class="gs-field" style="flex: 1;">
                      <span class="gs-field__label">Region *</span>
                      <input
                        class="gs-field__input"
                        type="text"
                        v-model="ossBucketDraft.region"
                        placeholder="oss-cn-hangzhou"
                      />
                    </label>
                    <label class="gs-field" style="flex: 1;">
                      <span class="gs-field__label">Bucket *</span>
                      <input
                        class="gs-field__input"
                        type="text"
                        v-model="ossBucketDraft.bucket"
                        placeholder="my-bucket"
                      />
                    </label>
                  </div>
                  <label class="gs-field">
                    <span class="gs-field__label">Endpoint（可选，自定义域名 / 传输加速 / 内网）</span>
                    <input
                      class="gs-field__input"
                      type="text"
                      v-model="ossBucketDraft.endpoint"
                      placeholder="oss-cn-hangzhou.aliyuncs.com"
                    />
                  </label>
                </div>
                <div class="gs-modal__footer">
                  <button class="gs-btn" type="button" @click="closeOssBucketModal">取消</button>
                  <button
                    class="gs-btn gs-btn--primary"
                    type="button"
                    :disabled="!ossBucketDraft.name.trim() || !ossBucketDraft.accessKeyId.trim() || !ossBucketDraft.accessKeySecret.trim() || !ossBucketDraft.region.trim() || !ossBucketDraft.bucket.trim()"
                    @click="onSaveOssBucket"
                  >保存</button>
                </div>
              </div>
            </div>
          </Teleport>

          <!-- ========== 下载源选择 Modal ========== -->
          <Teleport to="body">
            <div v-if="sourceModalVisible" class="gs-mask" @click.self="closeSourceSelector">
              <div class="gs-modal" @click.stop>
                <div class="gs-modal__header">
                  <span class="gs-modal__title">选择下载源</span>
                  <button class="gs-modal__close" type="button" @click="closeSourceSelector">×</button>
                </div>
                <div class="gs-modal__body">
                  <p class="gs-section__hint">选择从哪里下载模型。国内网络推荐用镜像，速度更快。</p>
                  <div class="gs-source-list">
                    <label
                      v-for="opt in DOWNLOAD_SOURCE_OPTIONS"
                      :key="opt.value"
                      class="gs-source-item"
                      :class="{ 'gs-source-item--active': selectedSource === opt.value }"
                    >
                      <input
                        type="radio"
                        :value="opt.value"
                        v-model="selectedSource"
                        class="gs-source-item__radio"
                      />
                      <div class="gs-source-item__info">
                        <span class="gs-source-item__label">{{ opt.label }}</span>
                        <span class="gs-source-item__hint">{{ opt.hint }}</span>
                      </div>
                    </label>
                  </div>
                </div>
                <div class="gs-modal__footer">
                  <button class="gs-btn" type="button" @click="closeSourceSelector">取消</button>
                  <button
                    class="gs-btn gs-btn--primary"
                    type="button"
                    @click="confirmSourceAndDownload"
                  >开始下载</button>
                </div>
              </div>
            </div>
          </Teleport>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
/* 本地AI模型 — 子 tab 切换（LLM / 文生图） */
.gs-localai__tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #f4f5f8;
  border-radius: 8px;
  width: fit-content;
}
.gs-localai__tab {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: #e8eaef;
  }
}
.gs-localai__tab--active {
  background: #fff;
  color: #2c6ff7;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

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
  margin: 0 12px;

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
    align-items: center;
    margin-left: 8px;
    gap: 8px;
  }
}

.gs-btn {
  all: unset;
  height: 23px;
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
  &__input-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  &__input {
    width: 100%;
    padding: 8px 34px 8px 10px;
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

  &__eye-btn {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: #6b7280;
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: #374151;
      background: #f3f4f6;
    }

    &:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 1px;
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

  &__key-capabilities {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  &__cap-badge {
    font-size: 10px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: 8px;
    background: #e0e7ff;
    color: #4338ca;
    line-height: 16px;
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

// —— 浏览器身份卡片样式 ——
.gs-browser {
  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

.gs-browser-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: border-color 0.15s;

  &:hover {
    border-color: #c7d2fe;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__usage {
    font-size: 11px;
    color: #9ca3af;
  }

  &__actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
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
    object-fit: contain;
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

// —— 外观主题设置 ——
.gs-theme {
  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
    cursor: default;
  }

  &__label {
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    flex-shrink: 0;
  }

  &__picker-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__picker {
    width: 32px;
    height: 28px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    padding: 2px;
    background: #fff;

    &::-webkit-color-swatch-wrapper {
      padding: 0;
    }
    &::-webkit-color-swatch {
      border: none;
      border-radius: 4px;
    }
  }

  &__hex {
    width: 90px;
    padding: 4px 8px;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    outline: none;
    background: #fff;
    color: #374151;
    text-transform: uppercase;

    &:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
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

// —— 飞书机器人卡片样式 ——
.gs-feishu__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gs-feishu-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: border-color 0.15s;

  &:hover { border-color: #93c5fd; }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__name {
    font-size: 13px;
    font-weight: 600;
    color: @color-text;
  }

  &__appid {
    font-size: 11px;
    color: @color-text-weak;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
}

// —— 通用 Modal 样式 ——
.gs-modal {
  width: 440px;
  max-height: 80vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  animation: gsPopIn 0.15s ease;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid #e5e7eb;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: @color-text;
  }

  &__close {
    all: unset;
    cursor: pointer;
    font-size: 18px;
    color: @color-text-weak;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover { background: #f3f4f6; color: @color-text; }
  }

  &__body {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 18px;
    border-top: 1px solid #e5e7eb;
  }
}

.gs-modal--wide {
  width: 540px;
}

.gs-field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__label {
    font-size: 12px;
    font-weight: 500;
    color: @color-text-weak;
  }

  &__input {
    padding: 7px 10px;
    font-size: 13px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    outline: none;
    background: #fff;
    transition: border-color 0.15s;

    &:focus { border-color: #3b82f6; }
  }

  &__secret-row {
    display: flex;
    gap: 6px;
    align-items: center;

    .gs-field__input { flex: 1; }
  }

  &__toggle {
    all: unset;
    cursor: pointer;
    padding: 6px 10px;
    font-size: 12px;
    color: #3b82f6;
    background: #eff6ff;
    border-radius: 6px;
    white-space: nowrap;

    &:hover { background: #dbeafe; }
  }
}

/* ===== 本地 LLM 模型 tab 样式 ===== */
.gs-local {
  &__progress {
    position: relative;
    display: inline-block;
    min-width: 150px;
    height: 24px;
    border-radius: 4px;
    background: #e5e7eb;
    overflow: hidden;
    vertical-align: middle;
  }
  &__progress-bar {
    height: 100%;
    background: #7396e5;
    border-radius: 4px;
    transition: width 0.2s;
  }
  &__progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 11px;
    color: #374151;
    white-space: nowrap;
    -webkit-text-stroke: 3px #e5e7eb;
    font-weight: bold;
    paint-order: stroke fill;
  }
  &__installed-badge {
    font-size: 12px;
    color: #16a34a;
    background: #dcfce7;
    padding: 4px 10px;
    border-radius: 6px;
    white-space: nowrap;
  }
  &__loaded-badge {
    display: inline-block;
    font-size: 11px;
    color: #059669;
    background: #d1fae5;
    padding: 1px 8px;
    border-radius: 10px;
    margin-left: 6px;
    vertical-align: middle;
    animation: pulse-green 2s infinite;
  }
}

@keyframes pulse-green {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* ===== 下载源选择 radio 卡片 ===== */
.gs-source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.gs-source-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { border-color: #c7d2fe; background: #fafbff; }
  &--active {
    border-color: #667eea;
    background: #f0f2ff;
  }
  &__radio {
    width: 16px; height: 16px; flex-shrink: 0;
    accent-color: #667eea;
  }
  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  &__label {
    font-size: 13px;
    font-weight: 600;
    color: #1f2937;
  }
  &__hint {
    font-size: 11px;
    color: #6b7280;
  }
}
</style>
