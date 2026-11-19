import { ref } from 'vue'
import {
  IMAGE_PROVIDERS,
  type ImageProviderId
} from '../../../main/nodePlugin/ImageGenNode/providers'
import {
  getImageProviderKey as _getImageProviderKey,
  loadAiGlobalConfig,
  saveAiGlobalConfig,
  type AiProviderId
} from '../../../shared/aiProviders'

/**
 * 图像生成全局配置（对齐 useLLMSettings 模式）：
 * 只管每个 provider 的 API Key；provider / model 选择由节点自己保存。
 *
 * ⚠️ 本文件已迁移到统一的 AI 配置存储（canvasdesk.ai.config）。
 *    Key 读写全部走 shared/aiProviders.ts，不再自己管理 localStorage。
 */

function allImageProviderIds(): ImageProviderId[] {
  return Object.keys(IMAGE_PROVIDERS) as ImageProviderId[]
}

function emptyKeyRecord(): Record<ImageProviderId, string> {
  const o = {} as Record<ImageProviderId, string>
  for (const p of allImageProviderIds()) o[p] = ''
  return o
}

// —— 全局单例 ref，module 级别 ——
// ⚠️ 必须 module 级：多个组件调用 useImageSettings() 拿到的是同一份状态
const draftKeys = ref<Record<ImageProviderId, string>>(emptyKeyRecord())

/**
 * 给引擎层（node.ts）用：按 provider 取 API Key。
 * 直接读 localStorage 绕过 ref（引擎层不走 Vue 响应式）。
 * 委托给统一模块。
 */
export function getImageProviderKey(provider: ImageProviderId): string {
  return _getImageProviderKey(provider)
}

export function useImageSettings() {
  /** SettingsDialog 打开时调用：把当前所有 key 装进 draftKeys */
  function initDraft(): void {
    const cfg = loadAiGlobalConfig()
    const fresh = emptyKeyRecord()
    for (const p of allImageProviderIds()) {
      fresh[p] = cfg.providers[p as AiProviderId]?.key ?? ''
    }
    draftKeys.value = fresh
  }

  /** 保存所有 provider 的 key 到全局配置 */
  function saveSettings(): void {
    const cfg = loadAiGlobalConfig()
    for (const p of allImageProviderIds()) {
      cfg.providers[p as AiProviderId].key = draftKeys.value[p].trim()
    }
    saveAiGlobalConfig(cfg)
  }

  /** 只保存指定 provider 的 key，其他 provider 保持不变 */
  function saveProviderKey(provider: ImageProviderId): void {
    const cfg = loadAiGlobalConfig()
    cfg.providers[provider as AiProviderId].key = draftKeys.value[provider].trim()
    saveAiGlobalConfig(cfg)
  }

  function clearKey(provider: ImageProviderId): void {
    draftKeys.value = { ...draftKeys.value, [provider]: '' }
  }

  /** 某个 provider 是否配了 key */
  function hasKey(provider: ImageProviderId): boolean {
    return (getImageProviderKey(provider) ?? '').length > 0
  }

  return {
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
