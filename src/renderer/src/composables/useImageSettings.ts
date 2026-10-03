import { ref } from 'vue'
import {
  IMAGE_CONFIG_KEY,
  IMAGE_PROVIDERS,
  readImageProviderKey,
  type ImageGlobalConfig,
  type ImageProviderId
} from '../../../main/nodePlugin/ImageGenNode/providers'

/**
 * 图像生成全局配置（对齐 useLLMSettings 模式）：
 * 只管每个 provider 的 API Key；provider / model 选择由节点自己保存。
 *
 * 存储格式：{ providers: { siliconflow: { key: "" }, openai: { key: "" }, ... } }
 */

function emptyKeyRecord(): Record<ImageProviderId, string> {
  const o = {} as Record<ImageProviderId, string>
  for (const p of Object.keys(IMAGE_PROVIDERS) as ImageProviderId[]) {
    o[p] = ''
  }
  return o
}

function defaultGlobalConfig(): ImageGlobalConfig {
  const providers = {} as Record<ImageProviderId, { key: string }>
  for (const p of Object.keys(IMAGE_PROVIDERS) as ImageProviderId[]) {
    providers[p] = { key: '' }
  }
  return { providers }
}

/** 渲染层也做一遍旧格式迁移（双保险）：v1 { provider, providers: { id: { key, model } } } → v2 只留 key */
function migrateIfNeeded(): void {
  const raw = localStorage.getItem(IMAGE_CONFIG_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const providers = parsed.providers
    if (!providers || typeof providers !== 'object') return
    const firstChild = Object.values(providers)[0] as Record<string, unknown> | undefined
    const hasModel = firstChild && typeof firstChild === 'object' && 'model' in firstChild
    if (!hasModel && !('provider' in parsed)) return
    const base = defaultGlobalConfig()
    const oldProviders = providers as Record<string, { key?: string }>
    for (const p of Object.keys(IMAGE_PROVIDERS) as ImageProviderId[]) {
      base.providers[p].key = typeof oldProviders[p]?.key === 'string' ? oldProviders[p]!.key! : ''
    }
    localStorage.setItem(IMAGE_CONFIG_KEY, JSON.stringify(base))
  } catch {
    // 不动
  }
}

/** 从 localStorage 加载全局配置，带旧版迁移 */
function loadGlobalConfig(): ImageGlobalConfig {
  migrateIfNeeded()
  const base = defaultGlobalConfig()
  try {
    const raw = localStorage.getItem(IMAGE_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ImageGlobalConfig>
      for (const p of Object.keys(IMAGE_PROVIDERS) as ImageProviderId[]) {
        const pc = parsed.providers?.[p]
        if (pc && typeof pc === 'object') {
          base.providers[p].key = typeof pc.key === 'string' ? pc.key : ''
        }
      }
    }
  } catch {
    // 解析失败走默认
  }
  return base
}

function saveGlobalConfig(cfg: ImageGlobalConfig): void {
  localStorage.setItem(IMAGE_CONFIG_KEY, JSON.stringify(cfg))
}

// —— 全局单例 ref，module 级别 ——
// ⚠️ 必须 module 级：多个组件调用 useImageSettings() 拿到的是同一份状态
const globalConfig = ref<ImageGlobalConfig>(loadGlobalConfig())
const draftKeys = ref<Record<ImageProviderId, string>>(emptyKeyRecord())

/**
 * 给引擎层（node.ts）用：按 provider 取 API Key。
 * 直接读 localStorage 绕过 ref（引擎层不走 Vue 响应式）。
 */
export function getImageProviderKey(provider: ImageProviderId): string {
  return readImageProviderKey(provider)
}

export function useImageSettings() {
  /** SettingsDialog 打开时调用：把当前所有 key 装进 draftKeys */
  function initDraft(): void {
    const fresh = emptyKeyRecord()
    for (const p of Object.keys(IMAGE_PROVIDERS) as ImageProviderId[]) {
      fresh[p] = globalConfig.value.providers[p]?.key ?? ''
    }
    draftKeys.value = fresh
  }

  /** 保存所有 provider 的 key 到全局配置 */
  function saveSettings(): void {
    const providers = {} as Record<ImageProviderId, { key: string }>
    for (const p of Object.keys(IMAGE_PROVIDERS) as ImageProviderId[]) {
      providers[p] = { key: draftKeys.value[p].trim() }
    }
    const newCfg: ImageGlobalConfig = { providers }
    globalConfig.value = newCfg
    saveGlobalConfig(newCfg)
  }

  /** 只保存指定 provider 的 key，其他 provider 保持不变 */
  function saveProviderKey(provider: ImageProviderId): void {
    const providers = {} as Record<ImageProviderId, { key: string }>
    for (const p of Object.keys(IMAGE_PROVIDERS) as ImageProviderId[]) {
      if (p === provider) {
        providers[p] = { key: draftKeys.value[p].trim() }
      } else {
        providers[p] = { key: globalConfig.value.providers[p]?.key ?? '' }
      }
    }
    const newCfg: ImageGlobalConfig = { providers }
    globalConfig.value = newCfg
    saveGlobalConfig(newCfg)
  }

  function clearKey(provider: ImageProviderId): void {
    draftKeys.value = { ...draftKeys.value, [provider]: '' }
  }

  /** 某个 provider 是否配了 key */
  function hasKey(provider: ImageProviderId): boolean {
    return (globalConfig.value.providers[provider]?.key ?? '').length > 0
  }

  return {
    // 全局配置（只读）
    globalConfig,
    // 草稿
    draftKeys,
    // 操作
    initDraft,
    saveSettings,
    saveProviderKey,
    clearKey,
    hasKey,
    getProviderKey: getImageProviderKey
  }
}
