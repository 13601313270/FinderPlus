/**
 * AI Provider 统一注册表 —— 单源真相。
 *
 * 合并了原来分散在三处的 provider 定义：
 *   - useLLMSettings.ts     → LLM_PROVIDERS （canvasdesk.llm.config）
 *   - ImageGenNode/providers.ts → IMAGE_PROVIDERS （canvasdesk.image.config）
 *   - TTSNode/STTNode       → 复用 ImageGenNode 的 provider id
 *
 * 统一后：
 *   - localStorage 键：canvasdesk.ai.config
 *   - qwen + dashscope 合并为 aliyun（同一套阿里云百炼 DashScope Key）
 *   - 其他 provider id 不变，只是从一个地方读 key
 *
 * 迁移逻辑：首次加载时自动把旧两份配置合并到新键，旧键备份为 .backup。
 */

// —— 新存储键 ——
export const AI_CONFIG_KEY = 'canvasdesk.ai.config'
const OLD_LLM_CONFIG_KEY = 'canvasdesk.llm.config'
const OLD_IMAGE_CONFIG_KEY = 'canvasdesk.image.config'
const OLD_LEGACY_KEY = 'canvasdesk.llm.api_key'

// —— Provider 能力位掩码 ——
export type AiProviderCapability = 'llm' | 'image' | 'tts' | 'stt'

/** 统一的 provider ID */
export type AiProviderId =
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

export interface AiProviderPreset {
  /** 中文展示名 */
  label: string
  /** 该服务商的 AI 能力位 */
  capabilities: readonly AiProviderCapability[]
}

/** 统一 Provider 注册表 */
export const AI_PROVIDERS: Readonly<Record<AiProviderId, AiProviderPreset>> = {
  deepseek: {
    label: 'DeepSeek',
    capabilities: ['llm']
  },
  openai: {
    label: 'OpenAI',
    capabilities: ['llm', 'image', 'stt']
  },
  kimi: {
    label: 'Kimi (Moonshot)',
    capabilities: ['llm']
  },
  aliyun: {
    label: '阿里云百炼',
    capabilities: ['llm', 'image', 'tts', 'stt']
  },
  glm: {
    label: '智谱 (GLM)',
    capabilities: ['llm', 'image', 'stt']
  },
  minimax: {
    label: 'MiniMax',
    capabilities: ['llm']
  },
  groq: {
    label: 'Groq',
    capabilities: ['llm']
  },
  mistral: {
    label: 'Mistral AI',
    capabilities: ['llm']
  },
  siliconflow: {
    label: '硅基流动 (SiliconFlow)',
    capabilities: ['llm', 'image', 'stt']
  },
  tokenplan: {
    label: '千问 Token Plan',
    capabilities: ['llm', 'image', 'tts', 'stt']
  },
  local: {
    label: '本地模型',
    capabilities: ['llm']
  }
}

export interface AiGlobalConfig {
  providers: Record<AiProviderId, { key: string }>
}

// —— Provider ID 集合工具 ——

function allProviderIds(): AiProviderId[] {
  return Object.keys(AI_PROVIDERS) as AiProviderId[]
}

function defaultGlobalConfig(): AiGlobalConfig {
  const providers = {} as Record<AiProviderId, { key: string }>
  for (const p of allProviderIds()) providers[p] = { key: '' }
  return { providers }
}

/** 旧 provider id → 新 provider id 映射 */
const PROVIDER_ID_REMAP: Record<string, AiProviderId | undefined> = {
  qwen: 'aliyun',
  dashscope: 'aliyun'
}

/** 旧 provider id 统一为新 id */
function remapProviderId(id: string): AiProviderId | undefined {
  return PROVIDER_ID_REMAP[id] ?? (allProviderIds().includes(id as AiProviderId) ? id as AiProviderId : undefined)
}

// —— 旧配置合并 ——

/** 从旧 LLM 配置里取 key，oldKey = canvasdesk.llm.api_key (单 key 遗留) */
function readLegacySingleKey(): string {
  try {
    return localStorage.getItem(OLD_LEGACY_KEY) ?? ''
  } catch { return '' }
}

/**
 * 从旧 LLM 配置读取指定 provider 的 key。
 * 旧 LLM 里的 qwen → 归到 aliyun。
 */
function readOldLlmKey(oldProviderId: string): string {
  try {
    const raw = localStorage.getItem(OLD_LLM_CONFIG_KEY)
    if (!raw) return ''
    const cfg = JSON.parse(raw) as { providers?: Record<string, { key?: string }> }
    return cfg.providers?.[oldProviderId]?.key ?? ''
  } catch { return '' }
}

/** 从旧 Image 配置读取指定 provider 的 key */
function readOldImageKey(oldProviderId: string): string {
  try {
    const raw = localStorage.getItem(OLD_IMAGE_CONFIG_KEY)
    if (!raw) return ''
    const cfg = JSON.parse(raw) as { providers?: Record<string, { key?: string }> }
    return cfg.providers?.[oldProviderId]?.key ?? ''
  } catch { return '' }
}

/**
 * 合并旧两份配置 → 新统一配置。
 *
 * 规则（按 provider 分情况）：
 *  - 非 aliyun 的 provider：Image key 优先（TTS/STT 当前已依赖 Image 配置，保持行为不变）
 *  - aliyun（原 qwen + dashscope）：dashscope(Image) key 优先，qwen(LLM) 作 fallback
 *  - deepseek 特殊：可能只有 legacy 单 key（canvasdesk.llm.api_key），兼容一下
 *
 * 旧配置存在任意一份即触发；合并完旧 key 备份为 .backup 并删除。
 */
function migrateFromOldConfigs(): void {
  const hasLlm = !!localStorage.getItem(OLD_LLM_CONFIG_KEY)
  const hasImage = !!localStorage.getItem(OLD_IMAGE_CONFIG_KEY)
  const hasLegacy = !!localStorage.getItem(OLD_LEGACY_KEY)

  if (!hasLlm && !hasImage && !hasLegacy) return

  const newCfg = defaultGlobalConfig()

  for (const p of allProviderIds()) {
    let key = ''
    if (p === 'aliyun') {
      // 从 dashscope(Image) + qwen(LLM) 两边取，dashscope 优先
      key = readOldImageKey('dashscope') || readOldLlmKey('qwen')
    } else {
      // 其他 provider：Image 优先（因为 TTS/STT 已依赖 Image）
      key = readOldImageKey(p) || readOldLlmKey(p)
    }
    if (p === 'deepseek' && !key) {
      // legacy 兼容
      key = readLegacySingleKey()
    }
    newCfg.providers[p].key = key
  }

  // 写新配置
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(newCfg))

  // 备份 + 删除旧键
  if (hasLlm) {
    const raw = localStorage.getItem(OLD_LLM_CONFIG_KEY)
    if (raw) localStorage.setItem(`${OLD_LLM_CONFIG_KEY}.backup`, raw)
    localStorage.removeItem(OLD_LLM_CONFIG_KEY)
  }
  if (hasImage) {
    const raw = localStorage.getItem(OLD_IMAGE_CONFIG_KEY)
    if (raw) localStorage.setItem(`${OLD_IMAGE_CONFIG_KEY}.backup`, raw)
    localStorage.removeItem(OLD_IMAGE_CONFIG_KEY)
  }
  if (hasLegacy) {
    localStorage.removeItem(OLD_LEGACY_KEY)
  }
}

/** 迁移只跑一次：模块加载时执行；幂等（旧键不存在就跳过） */
function ensureMigrated(): void {
  try {
    migrateFromOldConfigs()
  } catch {
    // 迁移失败不阻塞正常读取
  }
}
ensureMigrated()

// —— Key 读取（对外暴露，所有节点/UI 共用） ——

/** 按 provider 从统一配置取 API Key */
export function readProviderKey(provider: string): string {
  // 先做 id 归一化（兼容节点保存的旧 provider id：qwen / dashscope）
  const normalized = remapProviderId(provider)
  if (!normalized) return ''
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY)
    if (raw) {
      const cfg = JSON.parse(raw) as AiGlobalConfig
      return cfg.providers?.[normalized]?.key ?? ''
    }
  } catch {
    // fall through
  }
  return ''
}

/** 取某个 provider 的 label */
export function getProviderLabel(provider: string): string {
  const normalized = remapProviderId(provider)
  if (!normalized) return provider
  return AI_PROVIDERS[normalized]?.label ?? provider
}

/** 所有 provider id */
export function getAllProviderIds(): AiProviderId[] {
  return allProviderIds()
}

/** 某能力下的 provider 列表 */
export function getProviderIdsByCapability(cap: AiProviderCapability): AiProviderId[] {
  return allProviderIds().filter(p => AI_PROVIDERS[p].capabilities.includes(cap))
}

// —— 旧 API 兼容别名（逐节点迁移期间，减少 import 改动） ——

/**
 * 从 ImageGenNode/providers.ts 原来导出的同名函数重定向过来。
 * 旧节点代码里写 readImageProviderKey('dashscope') 一样能工作——
 * remapProviderId 会把 dashscope 归一化成 aliyun。
 */
export function readImageProviderKey(providerId: string): string {
  return readProviderKey(providerId)
}

/** 旧 useLLMSettings / node.ts 里的 getProviderKey 重定向 */
export function getProviderKey(provider: string): string {
  return readProviderKey(provider)
}

/** 旧 useImageSettings 的 getImageProviderKey 重定向 */
export function getImageProviderKey(provider: string): string {
  return readProviderKey(provider)
}

// —— 渲染层 composables 用 ——

/** 从 localStorage 加载当前统一配置（给 useLLMSettings / useImageSettings 做 draft） */
export function loadAiGlobalConfig(): AiGlobalConfig {
  ensureMigrated()
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY)
    console.log('[aiProviders] loadAiGlobalConfig → raw=', raw ? raw.length + ' bytes' : 'NULL')
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiGlobalConfig>
      const base = defaultGlobalConfig()
      for (const p of allProviderIds()) {
        const pc = parsed.providers?.[p]
        if (pc && typeof pc.key === 'string') {
          base.providers[p].key = pc.key
        }
      }
      return base
    }
  } catch (err) {
    console.error('[aiProviders] loadAiGlobalConfig parse FAILED:', err)
  }
  return defaultGlobalConfig()
}

/** 保存统一配置（UI 设置页调用） */
export function saveAiGlobalConfig(cfg: AiGlobalConfig): void {
  try {
    const json = JSON.stringify(cfg)
    console.log('[aiProviders] saveAiGlobalConfig →', AI_CONFIG_KEY, JSON.stringify(cfg.providers, (_, v) => typeof v === 'string' && v.length > 6 ? v.slice(0, 3) + '...' : v))
    localStorage.setItem(AI_CONFIG_KEY, json)
    // 立即回读验证
    const back = localStorage.getItem(AI_CONFIG_KEY)
    console.log('[aiProviders] 回读验证 →', back ? 'OK (' + back.length + ' bytes)' : 'EMPTY')
  } catch (err) {
    console.error('[aiProviders] saveAiGlobalConfig FAILED:', err)
  }
}
