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
 * Provider 预设：端点 URL + 默认 model。
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

/** 节点级配置（存 saveState） */
export interface LLMNodeConfig {
  provider: LLMProvider
  model: string      // 空串则用 LLM_PROVIDERS[provider].defaultModel
  jsonMode: boolean  // 仅 deepseek 有效
}

/** 全局配置：只存每个 provider 的 API Key */
interface LLMGlobalConfig {
  providers: Record<LLMProvider, { key: string }>
}

const CONFIG_KEY = 'canvasdesk.llm.config'
const LEGACY_KEY = 'canvasdesk.llm.api_key'

function emptyKeyRecord(): Record<LLMProvider, string> {
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

function defaultGlobalConfig(): LLMGlobalConfig {
  const providers = {} as Record<LLMProvider, { key: string }>
  for (const p of Object.keys(LLM_PROVIDERS) as LLMProvider[]) {
    providers[p] = { key: '' }
  }
  return { providers }
}

/** 从 localStorage 加载全局配置，带旧版迁移 */
function loadGlobalConfig(): LLMGlobalConfig {
  const base = defaultGlobalConfig()
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      // 旧版可能是 { provider, providers: { deepseek: { key, model, jsonMode } } }
      // 新版是 { providers: { deepseek: { key } } }
      const rawProviders = (parsed?.providers ?? {}) as Record<string, Record<string, unknown>>
      for (const p of Object.keys(LLM_PROVIDERS) as LLMProvider[]) {
        const pc = rawProviders[p]
        if (pc && typeof pc === 'object') {
          base.providers[p].key = typeof pc.key === 'string' ? pc.key : ''
        }
      }
      return base
    }
  } catch {
    // fall through
  }
  // 旧版兼容：只有 legacy api_key，按 deepseek 处理
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (legacy) {
    base.providers.deepseek.key = legacy
    localStorage.removeItem(LEGACY_KEY)
    localStorage.setItem(CONFIG_KEY, JSON.stringify(base))
    return base
  }
  return base
}

function saveGlobalConfig(cfg: LLMGlobalConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

// —— 全局单例 ref，module 级别 ——
// ⚠️ 必须 module 级：useLLMSettings() 被多个组件调用，只有 module 级才能共享同一份状态
const globalConfig = ref<LLMGlobalConfig>(loadGlobalConfig())
const draftKeys = ref<Record<LLMProvider, string>>(emptyKeyRecord())

/** 模型列表缓存（按 provider 共享，避免重复拉取） */
const modelLists = ref<Record<LLMProvider, string[]>>(emptyArrayRecord())

/** 取某个 provider 的 URL + defaultModel（节点级调用） */
export function resolveLLMEndpoint(provider: LLMProvider, modelOverride?: string): { url: string; model: string } {
  const preset = LLM_PROVIDERS[provider]
  const model = (modelOverride && modelOverride.trim()) || preset.defaultModel
  return { url: preset.url, model }
}

/** 给引擎层（node.ts）用：按 provider 取 API Key */
export function getProviderKey(provider: LLMProvider): string {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const cfg = JSON.parse(raw) as LLMGlobalConfig
      return cfg.providers[provider]?.key ?? ''
    }
  } catch {
    // fall through
  }
  return ''
}

export function useLLMSettings() {
  /** SettingsDialog 打开时调用：把当前所有 key 装进 draftKeys */
  function initDraft(): void {
    const fresh = emptyKeyRecord()
    for (const p of Object.keys(LLM_PROVIDERS) as LLMProvider[]) {
      fresh[p] = globalConfig.value.providers[p]?.key ?? ''
    }
    draftKeys.value = fresh
  }

  /** 保存所有 provider 的 key 到全局配置 */
  function saveSettings(): void {
    const providers = {} as Record<LLMProvider, { key: string }>
    for (const p of Object.keys(LLM_PROVIDERS) as LLMProvider[]) {
      providers[p] = { key: draftKeys.value[p].trim() }
    }
    const newCfg: LLMGlobalConfig = { providers }
    globalConfig.value = newCfg
    saveGlobalConfig(newCfg)
  }

  /** 只保存指定 provider 的 key，其他 provider 保持不变 */
  function saveProviderKey(provider: LLMProvider): void {
    const providers = {} as Record<LLMProvider, { key: string }>
    for (const p of Object.keys(LLM_PROVIDERS) as LLMProvider[]) {
      if (p === provider) {
        providers[p] = { key: draftKeys.value[p].trim() }
      } else {
        providers[p] = { key: globalConfig.value.providers[p]?.key ?? '' }
      }
    }
    const newCfg: LLMGlobalConfig = { providers }
    globalConfig.value = newCfg
    saveGlobalConfig(newCfg)
  }

  function clearKey(provider: LLMProvider): void {
    draftKeys.value = { ...draftKeys.value, [provider]: '' }
  }

  /** 某个 provider 是否配了 key */
  function hasKey(provider: LLMProvider): boolean {
    return (globalConfig.value.providers[provider]?.key ?? '').length > 0
  }

  /**
   * 拉某个 provider 的 /models 端点，结果缓存到 modelLists[provider]。
   * 节点 render.vue 里的"拉取模型"按钮调这个。
   */
  async function fetchModels(provider: LLMProvider, key: string): Promise<{ ok: boolean; error?: string }> {
    if (!key.trim()) {
      return { ok: false, error: '请先填入 API Key' }
    }
    try {
      const preset = LLM_PROVIDERS[provider]
      const res = await fetch(preset.modelsUrl, {
        headers: { 'Authorization': `Bearer ${key.trim()}` }
      })
      if (!res.ok) {
        return { ok: false, error: `拉取失败（${res.status} ${res.statusText}）` }
      }
      const data = await res.json()
      const list: string[] = []
      if (Array.isArray(data?.data)) {
        for (const item of data.data) {
          if (item && typeof item.id === 'string') list.push(item.id)
        }
      }
      modelLists.value = { ...modelLists.value, [provider]: list }
      if (list.length === 0) {
        return { ok: false, error: '该 Key 下没有可用模型' }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : '网络请求异常' }
    }
  }

  return {
    // 全局配置（只读）
    globalConfig,
    modelLists,
    // 草稿
    draftKeys,
    // 操作
    initDraft,
    saveSettings,
    saveProviderKey,
    clearKey,
    hasKey,
    fetchModels
  }
}
