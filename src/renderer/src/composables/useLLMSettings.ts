import { ref } from 'vue'
import {
  readProviderKey,
  loadAiGlobalConfig,
  saveAiGlobalConfig,
  type AiProviderId
} from '../../../shared/aiProviders'

/**
 * LLM Provider 预设：端点 URL + 默认 model。
 * 所有 Provider 都遵循 OpenAI-compatible Chat Completions 协议（POST {url}，messages 数组），
 * 并且都支持 GET {modelsUrl} 返回模型列表。
 *
 * ⚠️ 本文件已迁移到统一的 AI 配置存储（canvasdesk.ai.config）。
 *    Key 读写全部走 shared/aiProviders.ts，不再自己管理 localStorage。
 *    qwen + dashscope 已合并为 aliyun。
 */
export type LLMProvider =
  | 'deepseek'
  | 'openai'
  | 'kimi'
  | 'aliyun'       // ← 原 qwen(LLM) + dashscope(生图/TTS/STT) 合并
  | 'glm'
  | 'minimax'
  | 'groq'
  | 'mistral'
  | 'siliconflow'
  | 'tokenplan'
  | 'local'

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
  aliyun: {
    label: '阿里云百炼 (DashScope)',
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
  },
  // 千问 Token Plan（sk-sp- 前缀 Key，独立计费，端点完全不同于 DashScope）
  tokenplan: {
    label: '千问 Token Plan',
    url: 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
    modelsUrl: 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/models',
    defaultModel: 'qwen3.7-plus'
  },
  // 本地 LLM：不走 HTTP fetch，通过 IPC 调主进程 LlmRunner
  local: {
    label: '本地模型',
    url: 'canvasdesk-local://llm',
    modelsUrl: '',  // 本地模型不支持 /models 端点
    defaultModel: ''
  }
}

/** 节点级配置（存 saveState） */
export interface LLMNodeConfig {
  provider: LLMProvider
  model: string      // 空串则用 LLM_PROVIDERS[provider].defaultModel
  jsonMode: boolean  // 仅 deepseek 有效
}

function allLlmProviderIds(): LLMProvider[] {
  return Object.keys(LLM_PROVIDERS) as LLMProvider[]
}

function emptyKeyRecord(): Record<LLMProvider, string> {
  const o = {} as Record<LLMProvider, string>
  for (const p of allLlmProviderIds()) o[p] = ''
  return o
}

function emptyArrayRecord(): Record<LLMProvider, string[]> {
  const o = {} as Record<LLMProvider, string[]>
  for (const p of allLlmProviderIds()) o[p] = []
  return o
}

// —— 全局单例 ref，module 级别 ——
// ⚠️ 必须 module 级：useLLMSettings() 被多个组件调用，只有 module 级才能共享同一份状态

const draftKeys = ref<Record<LLMProvider, string>>(emptyKeyRecord())

/** 模型列表缓存（按 provider 共享，避免重复拉取） */
const modelLists = ref<Record<LLMProvider, string[]>>(emptyArrayRecord())

/** 取某个 provider 的 URL + defaultModel（节点级调用） */
export function resolveLLMEndpoint(provider: LLMProvider, modelOverride?: string): { url: string; model: string } {
  const preset = LLM_PROVIDERS[provider]
  const model = (modelOverride && modelOverride.trim()) || preset.defaultModel
  return { url: preset.url, model }
}

/** 给引擎层（node.ts）用：按 provider 取 API Key（已委托给统一模块） */
export function getProviderKey(provider: string): string {
  return readProviderKey(provider)
}

export function useLLMSettings() {
  /** SettingsDialog 打开时调用：把当前所有 key 装进 draftKeys */
  function initDraft(): void {
    const cfg = loadAiGlobalConfig()
    const fresh = emptyKeyRecord()
    for (const p of allLlmProviderIds()) {
      fresh[p] = cfg.providers[p as AiProviderId]?.key ?? ''
    }
    draftKeys.value = fresh
  }

  /** 保存所有 provider 的 key 到全局配置 */
  function saveSettings(): void {
    const cfg = loadAiGlobalConfig()
    for (const p of allLlmProviderIds()) {
      cfg.providers[p as AiProviderId].key = draftKeys.value[p].trim()
    }
    saveAiGlobalConfig(cfg)
  }

  /** 只保存指定 provider 的 key，其他 provider 保持不变 */
  function saveProviderKey(provider: LLMProvider): void {
    const cfg = loadAiGlobalConfig()
    cfg.providers[provider as AiProviderId].key = draftKeys.value[provider].trim()
    saveAiGlobalConfig(cfg)
  }

  function clearKey(provider: LLMProvider): void {
    draftKeys.value = { ...draftKeys.value, [provider]: '' }
  }

  /** 某个 provider 是否配了 key */
  function hasKey(provider: LLMProvider): boolean {
    return (readProviderKey(provider as string) ?? '').length > 0
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
