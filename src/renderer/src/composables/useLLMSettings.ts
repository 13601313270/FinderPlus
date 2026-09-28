import { ref } from 'vue'

export type LLMProvider = 'deepseek' | 'openai'

/** Provider 预设：端点 URL + 默认 model，用户可覆盖 model */
export const LLM_PROVIDERS: Record<LLMProvider, {
  label: string
  url: string          // chat completions endpoint
  modelsUrl: string    // GET /models endpoint
  defaultModel: string
}> = {
  deepseek: {
    label: 'DeepSeek',
    url: 'https://api.deepseek.com/chat/completions',
    modelsUrl: 'https://api.deepseek.com/models',
    defaultModel: 'deepseek-flash'
  },
  openai: {
    label: 'OpenAI (ChatGPT)',
    url: 'https://api.openai.com/v1/chat/completions',
    modelsUrl: 'https://api.openai.com/v1/models',
    defaultModel: 'gpt-4o-mini'
  }
}

interface LLMProviderConfig {
  key: string
  model: string // 用户可覆盖 model，空则用默认
}

interface LLMConfig {
  provider: LLMProvider
  providers: Record<LLMProvider, LLMProviderConfig>
}

const CONFIG_KEY = 'canvasdesk.llm.config'
const LEGACY_KEY = 'canvasdesk.llm.api_key'

function defaultConfig(): LLMConfig {
  return {
    provider: 'deepseek',
    providers: {
      deepseek: { key: '', model: '' },
      openai: { key: '', model: '' }
    }
  }
}

/** 从 localStorage 加载配置，带旧版 api_key 迁移 */
function loadConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LLMConfig
      if (parsed && parsed.provider && parsed.providers) return parsed
    }
  } catch {
    // 忽略解析错误，走默认
  }
  // 尝试从旧版 api_key 迁移
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (legacy) {
    const cfg = defaultConfig()
    cfg.providers.deepseek.key = legacy
    localStorage.removeItem(LEGACY_KEY)
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
    return cfg
  }
  return defaultConfig()
}

function saveConfig(cfg: LLMConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

// —— 全局单例 ref，module 级别 ——
const config = ref<LLMConfig>(loadConfig())
const visible = ref(false)

// 设置弹窗里的临时草稿（深拷贝，避免直接改全局）
let draftClone: LLMConfig | null = null

function cloneConfig(cfg: LLMConfig): LLMConfig {
  return JSON.parse(JSON.stringify(cfg))
}

/** 取当前 provider 生效的 URL + model（空 model 用预设） */
export function resolveLLMEndpoint(provider: LLMProvider, modelOverride?: string): { url: string; model: string } {
  const preset = LLM_PROVIDERS[provider]
  const model = (modelOverride && modelOverride.trim()) || preset.defaultModel
  return { url: preset.url, model }
}

/** 给引擎层（node.ts）用的静态访问器，返回当前生效的 API 配置 */
export function getStoredLLMConfig(): { provider: LLMProvider; key: string; url: string; model: string } {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const cfg = JSON.parse(raw) as LLMConfig
      const provider = cfg.provider
      const providerCfg = cfg.providers[provider]
      if (providerCfg) {
        const { url, model } = resolveLLMEndpoint(provider, providerCfg.model)
        return { provider, key: providerCfg.key ?? '', url, model }
      }
    }
  } catch {
    // fall through
  }
  return { provider: 'deepseek', key: '', url: LLM_PROVIDERS.deepseek.url, model: LLM_PROVIDERS.deepseek.defaultModel }
}

export function useLLMSettings() {
  const draftProvider = ref<LLMProvider>('deepseek')
  const draftKeys = ref<Record<LLMProvider, string>>({ deepseek: '', openai: '' })
  const draftModels = ref<Record<LLMProvider, string>>({ deepseek: '', openai: '' })

  // 模型列表状态（按 provider 存）
  const modelLists = ref<Record<LLMProvider, string[]>>({ deepseek: [], openai: [] })
  const modelsLoading = ref(false)
  const modelsError = ref<string>('')

  function openSettings(): void {
    draftClone = cloneConfig(config.value)
    draftProvider.value = draftClone.provider
    draftKeys.value = {
      deepseek: draftClone.providers.deepseek.key,
      openai: draftClone.providers.openai.key
    }
    draftModels.value = {
      deepseek: draftClone.providers.deepseek.model,
      openai: draftClone.providers.openai.model
    }
    visible.value = true
    // 切换 provider 时如果已有 key 且本地没缓存列表，自动拉一次
    if (draftKeys.value[draftProvider.value] && modelLists.value[draftProvider.value].length === 0) {
      void fetchModels(draftProvider.value, draftKeys.value[draftProvider.value])
    }
  }

  function closeSettings(): void {
    visible.value = false
    draftClone = null
    modelsError.value = ''
  }

  function saveSettings(): void {
    if (!draftClone) return
    draftClone.provider = draftProvider.value
    draftClone.providers.deepseek.key = draftKeys.value.deepseek.trim()
    draftClone.providers.openai.key = draftKeys.value.openai.trim()
    draftClone.providers.deepseek.model = draftModels.value.deepseek.trim()
    draftClone.providers.openai.model = draftModels.value.openai.trim()

    config.value = draftClone
    saveConfig(draftClone)
    visible.value = false
    draftClone = null
  }

  function clearKey(provider: LLMProvider): void {
    if (!draftClone) return
    draftKeys.value[provider] = ''
    draftClone.providers[provider].key = ''
    // 清掉缓存的模型列表
    modelLists.value[provider] = []
  }

  function hasKey(): boolean {
    const active = config.value.providers[config.value.provider]
    return active.key.length > 0
  }

  /** 当前选中 provider 的显示 label */
  const currentProviderLabel = (): string => LLM_PROVIDERS[config.value.provider].label

  /**
   * 调 Provider 的 /models 端点拉模型列表。
   * 成功了填 modelLists[provider]；失败了 modelsError 设原因。
   * 返回成功与否，方便调用方决定要不要 fallback。
   */
  async function fetchModels(provider: LLMProvider, key: string): Promise<boolean> {
    if (!key.trim()) {
      modelsError.value = '请先填入 API Key'
      return false
    }
    modelsLoading.value = true
    modelsError.value = ''
    try {
      const preset = LLM_PROVIDERS[provider]
      const res = await fetch(preset.modelsUrl, {
        headers: {
          'Authorization': `Bearer ${key.trim()}`
        }
      })
      if (!res.ok) {
        modelsError.value = `拉取失败（${res.status} ${res.statusText}）`
        modelLists.value[provider] = []
        return false
      }
      const data = await res.json()
      // OpenAI: { data: [{ id: 'gpt-4o', ... }] }
      // DeepSeek 同样兼容 OpenAI 格式
      const list: string[] = []
      if (Array.isArray(data?.data)) {
        for (const item of data.data) {
          if (item && typeof item.id === 'string') list.push(item.id)
        }
      }
      modelLists.value[provider] = list
      if (list.length === 0) {
        modelsError.value = '该 Key 下没有可用模型'
      }
      return list.length > 0
    } catch (err) {
      modelsError.value = err instanceof Error ? err.message : '网络请求异常'
      modelLists.value[provider] = []
      return false
    } finally {
      modelsLoading.value = false
    }
  }

  return {
    // 全局状态（渲染层只读）
    config,
    visible,
    // 草稿（弹窗内编辑）
    draftProvider,
    draftKeys,
    draftModels,
    // 模型列表
    modelLists,
    modelsLoading,
    modelsError,
    // 操作
    openSettings,
    closeSettings,
    saveSettings,
    clearKey,
    hasKey,
    currentProviderLabel,
    fetchModels
  }
}
