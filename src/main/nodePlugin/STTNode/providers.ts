/**
 * 语音转文字（STT）Provider 预设。
 *
 * 复用 ImageGenNode 的 API Key 存储（canvasdesk.image.config），
 * 所以节点侧不需要新增设置项，只要用户配过对应服务商的 Key 即可。
 *
 * 各家协议分两类：
 *
 *  1) openai-multipart —— OpenAI 兼容的 /audio/transcriptions
 *     multipart/form-data 上传文件，响应 { text }
 *     · 硅基流动  https://api.siliconflow.cn/v1/audio/transcriptions
 *     · OpenAI    https://api.openai.com/v1/audio/transcriptions
 *     · 智谱      https://open.bigmodel.cn/api/paas/v4/audio/transcriptions
 *
 *  2) dashscope-json —— 百炼 / Token Plan 的 multimodal-generation
 *     JSON 里塞 Base64 Data URI（也支持公网 URL），响应 output.text
 *     · 阿里云百炼  https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/...（必须填 Workspace ID）
 *     · Token Plan  https://token-plan.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
 */

import { readImageProviderKey, type ImageProviderId } from '../ImageGenNode/providers'

export type SttProviderId = Extract<
  ImageProviderId,
  'dashscope' | 'tokenplan' | 'siliconflow' | 'openai' | 'glm'
>

export type SttRequestFormat = 'openai-multipart' | 'dashscope-json'

export interface SttProviderPreset {
  label: string
  url: string
}

export const STT_PROVIDERS: Readonly<Record<SttProviderId, SttProviderPreset>> = {
  siliconflow: {
    label: '硅基流动 (SiliconFlow)',
    url: 'https://api.siliconflow.cn/v1/audio/transcriptions'
  },
  openai: {
    label: 'OpenAI',
    url: 'https://api.openai.com/v1/audio/transcriptions'
  },
  glm: {
    label: '智谱 (GLM-ASR)',
    url: 'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions'
  },
  dashscope: {
    label: '阿里云百炼 (Qwen-ASR)',
    url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
  },
  tokenplan: {
    label: '千问 Token Plan',
    url: 'https://token-plan.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
  }
}

export interface SttModelPreset {
  provider: SttProviderId
  requestFormat: SttRequestFormat
  /** maas = 需要用 {WorkspaceId}.cn-beijing.maas.aliyuncs.com 专属域名 */
  endpointKind?: 'dashscope' | 'maas'
}

/** 模型表：同一个模型名可能出现在不同 provider 下，所以用数组 + (provider, model) 查找 */
export const STT_MODELS: readonly (SttModelPreset & { id: string })[] = [
  // —— 阿里云百炼 ——
  { id: 'qwen-audio-3.0-asr-flash', provider: 'dashscope', requestFormat: 'dashscope-json', endpointKind: 'maas' },
  { id: 'qwen-audio-3.1-asr-flash', provider: 'dashscope', requestFormat: 'dashscope-json', endpointKind: 'maas' },

  // —— 千问 Token Plan ——
  { id: 'qwen-audio-3.0-asr-flash', provider: 'tokenplan', requestFormat: 'dashscope-json' },

  // —— 硅基流动 ——
  { id: 'FunAudioLLM/SenseVoiceSmall', provider: 'siliconflow', requestFormat: 'openai-multipart' },
  { id: 'TeleAI/TeleSpeechASR', provider: 'siliconflow', requestFormat: 'openai-multipart' },

  // —— OpenAI ——
  { id: 'gpt-4o-transcribe', provider: 'openai', requestFormat: 'openai-multipart' },
  { id: 'gpt-4o-mini-transcribe', provider: 'openai', requestFormat: 'openai-multipart' },
  { id: 'whisper-1', provider: 'openai', requestFormat: 'openai-multipart' },

  // —— 智谱 ——
  { id: 'glm-asr-2512', provider: 'glm', requestFormat: 'openai-multipart' }
]

/** 某 provider 下的可用模型 id 列表（第一项即默认模型） */
export function getSttModelIdsByProvider(provider: SttProviderId): readonly string[] {
  return STT_MODELS.filter(m => m.provider === provider).map(m => m.id)
}

export function getDefaultSttModel(provider: SttProviderId): string {
  return getSttModelIdsByProvider(provider)[0] ?? ''
}

/** 语音识别语言提示（auto = 自动识别） */
export const STT_LANGUAGES: readonly { id: string; label: string }[] = [
  { id: 'auto', label: '自动识别 / Auto' },
  { id: 'zh', label: '中文 / Chinese' },
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語 / Japanese' },
  { id: 'ko', label: '한국어 / Korean' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
  { id: 'ru', label: 'Русский' },
  { id: 'pt', label: 'Português' },
  { id: 'it', label: 'Italiano' },
  { id: 'ar', label: 'العربية' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'id', label: 'Bahasa Indonesia' },
  { id: 'vi', label: 'Tiếng Việt' },
  { id: 'th', label: 'ไทย' }
]

/** 该模型是否要求填写 WorkspaceId（仅百炼的 MAAS 端点需要） */
export function isSttMaasModel(provider: SttProviderId, model: string): boolean {
  if (provider !== 'dashscope') return false
  return STT_MODELS.some(m => m.provider === provider && m.id === model && m.endpointKind === 'maas')
}

export interface ResolvedSttEndpoint {
  provider: SttProviderId
  url: string
  key: string
  model: string
  requestFormat: SttRequestFormat
  endpointKind: 'dashscope' | 'maas'
}

/** provider + model 查预设；找不到时回落到该 provider 的第一个模型 */
export function resolveSttEndpoint(
  provider: SttProviderId,
  model: string,
  workspaceId = ''
): ResolvedSttEndpoint {
  const ids = getSttModelIdsByProvider(provider)
  const effectiveModel = ids.includes(model) ? model : (ids[0] ?? model)
  const preset = STT_MODELS.find(m => m.provider === provider && m.id === effectiveModel)
  const endpointKind = preset?.endpointKind ?? 'dashscope'

  let url = STT_PROVIDERS[provider].url
  if (provider === 'dashscope' && endpointKind === 'maas') {
    url = `https://${workspaceId.trim()}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
  }

  return {
    provider,
    url,
    key: readImageProviderKey(provider),
    model: effectiveModel,
    requestFormat: preset?.requestFormat ?? 'openai-multipart',
    endpointKind
  }
}
