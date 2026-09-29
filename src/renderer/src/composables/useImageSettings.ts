import { ref } from 'vue'
import {
  IMAGE_CONFIG_KEY,
  IMAGE_PROVIDERS,
  type ImageProviderId
} from '../../../main/nodePlugin/ImageGenNode/providers'

/**
 * 图像生成设置：与 LLM 设置完全独立的一套配置（独立 localStorage 键 canvasdesk.image.config），
 * 图像 Key 和文本 Key 各存各的，互不覆盖。
 *
 * 模型不在弹窗里拉取，而是走 providers.ts 的预设列表——因为**尺寸选项由模型决定**，
 * 模型和尺寸表必须成对维护，随便填个未知模型就拿不到合法尺寸了。
 */

interface ImageProviderConfig {
  key: string
  model: string
}

interface ImageConfig {
  provider: ImageProviderId
  providers: Record<ImageProviderId, ImageProviderConfig>
}

function providerIds(): ImageProviderId[] {
  return Object.keys(IMAGE_PROVIDERS) as ImageProviderId[]
}

function allProviders(): Record<ImageProviderId, ImageProviderConfig> {
  const o = {} as Record<ImageProviderId, ImageProviderConfig>
  for (const p of providerIds()) {
    o[p] = { key: '', model: '' }
  }
  return o
}

function emptyStringRecord(): Record<ImageProviderId, string> {
  const o = {} as Record<ImageProviderId, string>
  for (const p of providerIds()) {
    o[p] = ''
  }
  return o
}

function defaultConfig(): ImageConfig {
  return {
    provider: 'siliconflow',
    providers: allProviders()
  }
}

/** 以默认配置为底逐个 merge，保证新增 Provider 的 slot 一定存在 */
function loadConfig(): ImageConfig {
  const base = defaultConfig()
  try {
    const raw = localStorage.getItem(IMAGE_CONFIG_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<ImageConfig>
    if (parsed?.provider && providerIds().includes(parsed.provider)) {
      base.provider = parsed.provider
    }
    if (parsed?.providers) {
      for (const p of providerIds()) {
        const pc = parsed.providers[p]
        if (pc && typeof pc === 'object') {
          base.providers[p].key = typeof pc.key === 'string' ? pc.key : ''
          base.providers[p].model = typeof pc.model === 'string' ? pc.model : ''
        }
      }
    }
  } catch {
    // 解析失败走默认
  }
  return base
}

function saveConfig(cfg: ImageConfig): void {
  localStorage.setItem(IMAGE_CONFIG_KEY, JSON.stringify(cfg))
}

// —— 全局单例 ref，module 级别 ——
// ⚠️ 必须 module 级：节点 render.vue 与设置弹窗都调 useImageSettings()，只有 module 级才能共享同一份状态
const config = ref<ImageConfig>(loadConfig())
const visible = ref(false)
const draftProvider = ref<ImageProviderId>('siliconflow')
const draftKeys = ref<Record<ImageProviderId, string>>(emptyStringRecord())
const draftModels = ref<Record<ImageProviderId, string>>(emptyStringRecord())

// 弹窗内的临时草稿（深拷贝，避免直接改全局）
let draftClone: ImageConfig | null = null

export function useImageSettings() {
  function openSettings(): void {
    const clone = JSON.parse(JSON.stringify(config.value)) as ImageConfig
    draftClone = clone
    draftProvider.value = clone.provider
    // 构造完整新对象再一次性赋值——Vue 3 ref 不追踪嵌套属性赋值，必须触发顶层 .value 变更
    const newKeys = emptyStringRecord()
    const newModels = emptyStringRecord()
    for (const p of providerIds()) {
      newKeys[p] = clone.providers[p]?.key ?? ''
      newModels[p] = clone.providers[p]?.model ?? ''
    }
    draftKeys.value = newKeys
    draftModels.value = newModels
    visible.value = true
  }

  function closeSettings(): void {
    visible.value = false
    draftClone = null
  }

  function saveSettings(): void {
    if (!draftClone) return
    draftClone.provider = draftProvider.value
    for (const p of providerIds()) {
      draftClone.providers[p].key = draftKeys.value[p].trim()
      draftClone.providers[p].model = draftModels.value[p].trim()
    }
    config.value = draftClone
    saveConfig(draftClone)
    visible.value = false
    draftClone = null
  }

  function clearKey(provider: ImageProviderId): void {
    if (!draftClone) return
    // 顶层 .value 赋值才会触发 Vue 响应式
    draftKeys.value = { ...draftKeys.value, [provider]: '' }
    draftClone.providers[provider].key = ''
  }

  function hasKey(): boolean {
    return config.value.providers[config.value.provider].key.length > 0
  }

  /** 当前选中 Provider 的显示 label */
  const currentProviderLabel = (): string => IMAGE_PROVIDERS[config.value.provider].label

  return {
    // 全局状态（渲染层只读；节点 render.vue 靠 watch 它感知模型/尺寸变化）
    config,
    visible,
    // 草稿（弹窗内编辑）
    draftProvider,
    draftKeys,
    draftModels,
    // 操作
    openSettings,
    closeSettings,
    saveSettings,
    clearKey,
    hasKey,
    currentProviderLabel
  }
}
