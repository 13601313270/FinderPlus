import { ref } from 'vue'

export type LLMProvider =
  | 'deepseek'
  | 'openai'
  | 'kimi'
  | 'qwen'
  | 'glm'
  | 'minimax'
  | 'groq'
  | 'mistral'
  | 'siliconflow'

/**
 * Provider 预设：端点 URL + 默认 model，用户可覆盖 model。
 * 所有 Provider 都遵循 OpenAI-compatible Chat Completions 协议（POST {url}，messages 数组），
 * 并且都支持 GET {modelsUrl} 返回模型列表。
 *
 * 新增 Provider 只需：在 LLMProvider union 加字面量、在这里加一条、在 node.ts PROVIDER_PRESETS 同步一条。
 */
export const LLM_PROVIDERS: Record<LLMProvider, {
  label: string
  url: string          // chat completions endpoint（POST）
  modelsUrl: string    // models listing endpoint（GET）
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
  },
  kimi: {
    label: 'Kimi (Moonshot)',
    url: 'https://api.moonshot.cn/v1/chat/completions',
    modelsUrl: 'https://api.moonshot.cn/v1/models',
    defaultModel: 'moonshot-v1-8k'
  },
  qwen: {
    label: '通义千问 (DashScope)',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    modelsUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
    defaultModel: 'qwen-plus'
  },
  glm: {
    label: '智谱 (GLM)',
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    modelsUrl: 'https://open.bigmodel.cn/api/paas/v4/models',
    defaultModel: 'glm-4'
  },
  minimax: {
    label: 'MiniMax',
    url: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    modelsUrl: 'https://api.minimax.chat/v1/models',
    defaultModel: 'abab6.5s-chat'
  },
  groq: {
    label: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    defaultModel: 'llama-3.3-70b-versatile'
  },
  mistral: {
    label: 'Mistral AI',
    url: 'https://api.mistral.ai/v1/chat/completions',
    modelsUrl: 'https://api.mistral.ai/v1/models',
    defaultModel: 'mistral-small-latest'
  },
  siliconflow: {
    label: '硅基流动 (SiliconFlow)',
    url: 'https://api.siliconflow.cn/v1/chat/completions',
    modelsUrl: 'https://api.siliconflow.cn/v1/models',
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct'
  }
}

function allProviders(): Record<LLMProvider, { key: string; model: string }> {
  const o = {} as Record<LLMProvider, { key: string; model: string }>
  for (const p of Object.keys(LLM_PROVIDERS) as LLMProvider[]) {
    o[p] = { key: '', model: '' }
  }
  return o
}

function emptyStringRecord(): Record<LLMProvider, string> {
  const o = {} as Record<LLMProvider, string>
  for (const p of Object.keys(LLM_PROVIDERS) as LLMProvider[]) {
    o[p] = ''
  }
  return o
}

function emptyArrayRecord(): Record<LLMProvider, string[]> {
  const o = {} as Record<LLMProvider, string[]>
  for (const p of Object.keys(LLM_PROVIDERS) as LLMProvider[]) {
    o[p] = []
  }
  return o
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
    providers: allProviders()
  }
}

/** 从 localStorage 加载配置，带旧版 api_key 迁移和 providers merge 兼容 */
function loadConfig(): LLMConfig {
  const base = defaultConfig()
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LLMConfig>
      // provider 字段：有就用，没就保留默认 deepseek
      if (parsed?.provider && Object.keys(LLM_PROVIDERS).includes(parsed.provider)) {
        base.provider = parsed.provider as LLMProvider
      }
      // providers：逐个 merge，旧 config 只有 deepseek/openai 也能补齐新 provider 的空 slot
      if (parsed?.providers) {
        for (const p of Object.keys(LLM_PROVIDERS) as LLMProvider[]) {
          const pc = parsed.providers[p]
          if (pc && typeof pc === 'object') {
            base.providers[p].key = typeof pc.key === 'string' ? pc.key : ''
            base.providers[p].model = typeof pc.model === 'string' ? pc.model : ''
          }
        }
      }
      return base
    }
  } catch {
    // 忽略解析错误，走默认
  }
  // 尝试从旧版 api_key 迁移
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (legacy) {
    base.providers.deepseek.key = legacy
    localStorage.removeItem(LEGACY_KEY)
    localStorage.setItem(CONFIG_KEY, JSON.stringify(base))
    return base
  }
  return base
}

function saveConfig(cfg: LLMConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

// —— 全局单例 ref，module 级别 ——
// ⚠️ 必须 module 级：useLLMSettings() 被多个组件调用，只有 module 级才能共享同一份状态
const config = ref<LLMConfig>(loadConfig())
const visible = ref(false)
const draftProvider = ref<LLMProvider>('deepseek')
const draftKeys = ref<Record<LLMProvider, string>>(emptyStringRecord())
const draftModels = ref<Record<LLMProvider, string>>(emptyStringRecord())
const modelLists = ref<Record<LLMProvider, string[]>>(emptyArrayRecord())
const modelsLoading = ref(false)
const modelsError = ref<string>('')

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
  // 所有状态都是 module 级单例，函数体里不再新建任何 ref

  function openSettings(): void {
    draftClone = cloneConfig(config.value)
    draftProvider.value = draftClone.provider
    // 构造完整的新对象再一次性赋值——Vue 3 ref 不追踪嵌套属性赋值，必须触发顶层 .value 变更
    const all = Object.keys(LLM_PROVIDERS) as LLMProvider[]
    const newKeys = emptyStringRecord()
    const newModels = emptyStringRecord()
    for (const p of all) {
      const pc = draftClone.providers[p]
      newKeys[p] = pc?.key ?? ''
      newModels[p] = pc?.model ?? ''
    }
    draftKeys.value = newKeys
    draftModels.value = newModels
    // 模型列表缓存按 provider 独立，不清空——保留已经拉好的
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
    // 写回所有 provider 的 key / model
    for (const p of Object.keys(LLM_PROVIDERS) as LLMProvider[]) {
      draftClone.providers[p].key = draftKeys.value[p].trim()
      draftClone.providers[p].model = draftModels.value[p].trim()
    }

    config.value = draftClone
    saveConfig(draftClone)
    visible.value = false
    draftClone = null
  }

  function clearKey(provider: LLMProvider): void {
    if (!draftClone) return
    // 顶层 .value 赋值才会触发 Vue 响应式
    draftKeys.value = { ...draftKeys.value, [provider]: '' }
    draftClone.providers[provider].key = ''
    // 清掉缓存的模型列表
    modelLists.value = { ...modelLists.value, [provider]: [] }
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
