/**
 * TTS Provider 预设：文生语音节点专用。
 *
 * 阿里云有两套独立计费 / 独立端点的服务：
 *
 *  1) 阿里云百炼 (dashscope) —— DashScope 按量付费
 *     host: dashscope.aliyuncs.com（旧）或 {WorkspaceId}.cn-beijing.maas.aliyuncs.com（新）
 *     Key 前缀：sk-
 *     支持的模型：qwen3-tts-flash / qwen-audio-3.1-tts-flash / qwen-audio-3.1-tts-next
 *     qwen-audio-3.1-tts-next 支持参考音频音色克隆（audiogen 格式）
 *
 *  2) 千问 Token Plan (tokenplan) —— 独立计费
 *     host: token-plan.cn-beijing.maas.aliyuncs.com
 *     Key 前缀：sk-sp-
 *     支持的模型：qwen3-tts-flash / qwen-audio-3.0-tts-flash / qwen-audio-3.0-tts-plus
 *     端点只认 simple 格式（text + voice），**不支持 audiogen / 参考音频克隆**
 */

import { readImageProviderKey, type ImageProviderId } from '../ImageGenNode/providers'

/** TTS provider 复用 ImageGenNode 的 provider id（共用同一个 API Key 存储） */
export type TtsProviderId = Extract<ImageProviderId, 'dashscope' | 'tokenplan'>

// —— DashScope 按量付费的模型 ID ——
export type DashscopeLegacyModelId = 'qwen3-tts-flash' | 'qwen3-tts-instruct-flash'
export type DashscopeMaasSimpleModelId = 'qwen-audio-3.1-tts-flash'
export type DashscopeMaasAudioGenModelId = 'qwen-audio-3.1-tts-next'
export type DashscopeTtsModelId = DashscopeLegacyModelId | DashscopeMaasSimpleModelId | DashscopeMaasAudioGenModelId

// —— Token Plan 的模型 ID ——
export type TokenPlanSimpleModelId = 'qwen3-tts-flash' | 'qwen-audio-3.0-tts-flash' | 'qwen-audio-3.0-tts-plus'
export type TokenPlanTtsModelId = TokenPlanSimpleModelId

/** 请求体格式 —— 两套 API 体系各自独立枚举，互不混淆 */
export type TtsRequestFormat =
  | 'dashscope-sync'      // DashScope 旧端点 multimodal-generation（qwen3-tts-flash / instruct-flash）
  | 'dashscope-maas'      // DashScope MAAS SpeechSynthesizer simple（qwen-audio-3.1-tts-flash，支持 instruction）
  | 'dashscope-audiogen'  // DashScope MAAS SpeechSynthesizer audiogen（qwen-audio-3.1-tts-next，支持参考音频克隆）
  | 'tokenplan-simple'    // Token Plan SpeechSynthesizer（仅 text + voice + format + sample_rate，无扩展字段）

/** 端点类型：决定是否需要 workspaceId */
export type TtsEndpointKind = 'dashscope' | 'maas'

export interface TtsModelPreset {
  /** 所属 provider */
  provider: TtsProviderId
  /** 请求体格式 */
  requestFormat: TtsRequestFormat
  /** 端点类型 */
  endpointKind: TtsEndpointKind
  /** 默认音色 */
  defaultVoice?: string
  /** 音色列表 */
  voices?: readonly TtsVoice[]
  /** 是否支持 instructions */
  supportsInstructions?: boolean
  /** MAAS 端点的输出格式（wav / mp3 等） */
  defaultFormat?: string
  /** MAAS 端点的采样率 */
  defaultSampleRate?: number
  /** 是否支持参考音频音色克隆（仅 DashScope 的 qwen-audio-3.1-tts-next 支持） */
  supportsReferenceAudio?: boolean
}

export interface TtsVoice {
  id: string
  label: { zh: string; en: string }
  gender?: 'female' | 'male'
  dialect?: string
}

// —— 音色列表 ——

// DashScope multimodal-generation 旧端点（qwen3-tts-flash / qwen3-tts-instruct-flash）
export const TTS_VOICES_LEGACY: readonly TtsVoice[] = [
  { id: 'Cherry', label: { zh: '樱桃 (女)', en: 'Cherry (F)' }, gender: 'female' },
  { id: 'Serena', label: { zh: '塞琳娜 (女)', en: 'Serena (F)' }, gender: 'female' },
  { id: 'Ethan', label: { zh: '伊森 (男)', en: 'Ethan (M)' }, gender: 'male' },
  { id: 'Kevin', label: { zh: '凯文 (男)', en: 'Kevin (M)' }, gender: 'male' },
  { id: 'Qing-Er', label: { zh: '晴儿 (女·普通话)', en: 'Qing-Er (Mandarin F)' }, gender: 'female' },
  { id: 'Long-Yunxi', label: { zh: '龙云溪 (男·普通话)', en: 'Long-Yunxi (Mandarin M)' }, gender: 'male' },
  { id: 'Long-Anni', label: { zh: '龙安妮 (女·普通话)', en: 'Long-Anni (Mandarin F)' }, gender: 'female' },
  { id: 'A-Li', label: { zh: '阿狸 (女·普通话)', en: 'A-Li (Mandarin F)' }, gender: 'female' }
]

// DashScope MAAS 端点（qwen-audio-3.1 系列，voice ID 带 _v3.1 后缀）
export const TTS_VOICES_DASHSCOPE_MAAS: readonly TtsVoice[] = [
  { id: 'longanhuan_v3.1', label: { zh: '龙安欢 (女·普通话)', en: 'Longanhuan (Mandarin F)' }, gender: 'female' },
  { id: 'longanyang_v3.1', label: { zh: '龙安阳 (男·普通话)', en: 'Longanyang (Mandarin M)' }, gender: 'male' },
  { id: 'longxiaoyan_v3.1', label: { zh: '龙晓燕 (女·普通话)', en: 'Longxiaoyan (Mandarin F)' }, gender: 'female' },
  { id: 'longyunxi_v3.1', label: { zh: '龙云溪 (男·普通话)', en: 'Longyunxi (Mandarin M)' }, gender: 'male' }
]

// Token Plan SpeechSynthesizer（qwen-audio-3.0 系列，CosyVoice 引擎，voice ID 无 _v3.1 后缀）
export const TTS_VOICES_TOKENPLAN: readonly TtsVoice[] = [
  { id: 'longanlingxin', label: { zh: '龙安灵心 (女·普通话)', en: 'Longanlingxin (Mandarin F)' }, gender: 'female' },
  { id: 'longanlingxi', label: { zh: '龙安灵希 (女·普通话)', en: 'Longanlingxi (Mandarin F)' }, gender: 'female' },
  { id: 'longanqian', label: { zh: '龙安千 (女·普通话)', en: 'Longanqian (Mandarin F)' }, gender: 'female' },
  { id: 'longanxiaoxin', label: { zh: '龙安小芯 (女·普通话)', en: 'Longanxiaoxin (Mandarin F)' }, gender: 'female' },
  { id: 'longanlufeng', label: { zh: '龙安陆风 (男·普通话)', en: 'Longanlufeng (Mandarin M)' }, gender: 'male' }
]

// —— 语言 / 采样率枚举 ——
export const TTS_LANGUAGE_TYPES = [
  'Chinese', 'English', 'Japanese', 'Korean', 'French', 'German',
  'Russian', 'Italian', 'Spanish', 'Portuguese'
] as const
export type TtsLanguageType = (typeof TTS_LANGUAGE_TYPES)[number]

export const TTS_SAMPLE_RATES = [8000, 16000, 24000, 44100, 48000] as const
export type TtsSampleRate = (typeof TTS_SAMPLE_RATES)[number]
export const DEFAULT_SAMPLE_RATE: TtsSampleRate = 24000

// —— 端点 URL ——

const DASHSCOPE_SYNC_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
const DASHSCOPE_MAAS_URL_TEMPLATE = 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer'
const TOKENPLAN_TTS_URL = 'https://token-plan.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer'

// —— Provider 预设模型表 ——

export const TTS_MODELS: Readonly<Record<string, TtsModelPreset>> = {
  // —— DashScope 按量付费 ——
  'qwen3-tts-flash': {
    provider: 'dashscope',
    endpointKind: 'dashscope',
    requestFormat: 'dashscope-sync',
    defaultVoice: 'Cherry',
    voices: TTS_VOICES_LEGACY
  },
  'qwen3-tts-instruct-flash': {
    provider: 'dashscope',
    endpointKind: 'dashscope',
    requestFormat: 'dashscope-sync',
    defaultVoice: 'Cherry',
    voices: TTS_VOICES_LEGACY,
    supportsInstructions: true
  },
  'qwen-audio-3.1-tts-flash': {
    provider: 'dashscope',
    endpointKind: 'maas',
    requestFormat: 'dashscope-maas',
    defaultVoice: 'longanhuan_v3.1',
    voices: TTS_VOICES_DASHSCOPE_MAAS,
    supportsInstructions: true,
    defaultFormat: 'wav',
    defaultSampleRate: 24000
  },
  'qwen-audio-3.1-tts-next': {
    provider: 'dashscope',
    endpointKind: 'maas',
    requestFormat: 'dashscope-audiogen',
    defaultFormat: 'wav',
    defaultSampleRate: 24000,
    supportsReferenceAudio: true
  },

  // —— Token Plan ——
  'qwen-audio-3.0-tts-plus': {
    provider: 'tokenplan',
    endpointKind: 'maas',
    requestFormat: 'tokenplan-simple',
    defaultVoice: 'longanlingxin',
    voices: TTS_VOICES_TOKENPLAN,
    defaultFormat: 'wav',
    defaultSampleRate: 24000
  }
}

/** TTS 模型 ID（联合类型，包含 DashScope + Token Plan 全部） */
export type TtsModelId = keyof typeof TTS_MODELS

/** 按 provider 过滤出可用模型 ID */
export function getTtsModelIdsByProvider(provider: TtsProviderId): readonly TtsModelId[] {
  return Object.keys(TTS_MODELS).filter(m => TTS_MODELS[m as TtsModelId].provider === provider) as TtsModelId[]
}

/** 按 provider 的默认模型 */
export function getDefaultTtsModel(provider: TtsProviderId): TtsModelId {
  const ids = getTtsModelIdsByProvider(provider)
  return ids[0] ?? 'qwen3-tts-flash'
}

/** 是否 DashScope MAAS 端点模型（需要 WorkspaceId） */
export function isMaasModel(model: TtsModelId): boolean {
  const p = TTS_MODELS[model]
  return p?.endpointKind === 'maas' && p?.provider === 'dashscope'
}

/** 是否 Token Plan 模型（SpeechSynthesizer 端点，不需要 WorkspaceId） */
export function isTokenPlanModel(model: TtsModelId): boolean {
  return TTS_MODELS[model]?.provider === 'tokenplan'
}

/** 是否支持参考音频音色克隆（仅 DashScope 的 qwen-audio-3.1-tts-next） */
export function supportsReferenceAudio(model: TtsModelId): boolean {
  return TTS_MODELS[model]?.supportsReferenceAudio === true
}

// —— 端点解析 ——

export interface ResolvedTtsEndpoint {
  provider: TtsProviderId
  url: string
  key: string
  model: string
  requestFormat: TtsRequestFormat
  endpointKind: TtsEndpointKind
  defaultVoice?: string
  voices?: readonly TtsVoice[]
  supportsInstructions: boolean
  defaultFormat?: string
  defaultSampleRate?: number
}

/**
 * 解析 TTS 端点——provider id 决定一切：host / 模型列表 / 音色 / 请求体格式。
 * 零 Key 前缀分支，完全按 provider id 查表。
 */
export function resolveTtsEndpoint(
  providerId: TtsProviderId,
  model: TtsModelId,
  workspaceId = ''
): ResolvedTtsEndpoint {
  const preset = TTS_MODELS[model] ?? TTS_MODELS[getDefaultTtsModel(providerId)]
  // provider 不认时回落
  const safeProvider: TtsProviderId = preset?.provider ?? providerId

  let url: string
  if (safeProvider === 'tokenplan') {
    url = TOKENPLAN_TTS_URL
  } else if (preset?.endpointKind === 'maas') {
    url = DASHSCOPE_MAAS_URL_TEMPLATE.replace('{WorkspaceId}', workspaceId)
  } else {
    url = DASHSCOPE_SYNC_URL
  }

  return {
    provider: safeProvider,
    url,
    key: readImageProviderKey(safeProvider),
    model,
    requestFormat: preset?.requestFormat ?? 'dashscope-sync',
    endpointKind: preset?.endpointKind ?? 'dashscope',
    defaultVoice: preset?.defaultVoice,
    voices: preset?.voices,
    supportsInstructions: preset?.supportsInstructions ?? false,
    defaultFormat: preset?.defaultFormat,
    defaultSampleRate: preset?.defaultSampleRate
  }
}
