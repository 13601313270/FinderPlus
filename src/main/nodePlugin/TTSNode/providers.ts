/**
 * TTS Provider 预设：文生语音节点专用。
 *
 * 阿里云百炼 2026 年架构迁移后，存在两套端点：
 *
 *  1) DashScope multimodal-generation（旧端点，暂不需要 workspaceId）
 *     —— qwen3-tts-flash / qwen3-tts-instruct-flash
 *     —— 复用 ImageGenNode 的 DASHSCOPE_API_KEY
 *     —— 请求体：{ input: { text, voice, language_type, instructions? } }
 *
 *  2) MAAS SpeechSynthesizer（新端点，{WorkspaceId}.maas.aliyuncs.com）
 *     —— qwen-audio-3.1-tts-flash / qwen-audio-3.1-tts-next
 *     —— 需要业务空间 ID + DASHSCOPE_API_KEY
 *     —— 分两种请求体：
 *        simple  → 纯文生语音（tts-flash），请求体：{ input: { text, voice, format, sample_rate, instruction? } }
 *        audiogen → 支持参考音频音色克隆（tts-next），请求体：{ input: { text_prompt, references? } }
 */

import { readImageProviderKey } from '../ImageGenNode/providers'

/** 旧模型：DashScope multimodal-generation 端点 */
export type TtsLegacyModelId = 'qwen3-tts-flash' | 'qwen3-tts-instruct-flash'
/** 新模型：MAAS 端点 */
export type TtsMaasSimpleModelId = 'qwen-audio-3.1-tts-flash'
export type TtsMaasAudioGenModelId = 'qwen-audio-3.1-tts-next'
export type TtsModelId = TtsLegacyModelId | TtsMaasSimpleModelId | TtsMaasAudioGenModelId

/** 请求体格式 */
export type TtsRequestFormat = 'dashscope-sync' | 'maas-simple' | 'maas-audiogen'

/** 端点类型：决定是否需要 workspaceId */
export type TtsEndpointKind = 'dashscope' | 'maas'

export interface TtsModelPreset {
  /** 请求体格式 */
  requestFormat: TtsRequestFormat
  /** 端点类型 */
  endpointKind: TtsEndpointKind
  /** 默认音色 */
  defaultVoice?: string
  /** 音色列表（旧模型独有） */
  voices?: readonly TtsVoice[]
  /** 是否支持 instructions */
  supportsInstructions?: boolean
  /** MAAS 端点的输出格式（wav / mp3 等） */
  defaultFormat?: string
  /** MAAS 端点的采样率 */
  defaultSampleRate?: number
}

export interface TtsVoice {
  id: string
  label: { zh: string; en: string }
  gender?: 'female' | 'male'
  dialect?: string
}

// —— 旧模型音色列表（DashScope multimodal-generation 端点）——
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

// —— MAAS 端点音色（Qwen-Audio-TTS 系统音色，见阿里云文档）——
export const TTS_VOICES_MAAS: readonly TtsVoice[] = [
  { id: 'longanhuan_v3.1', label: { zh: '龙安欢 (女·普通话)', en: 'Longanhuan (Mandarin F)' }, gender: 'female' },
  { id: 'longanyang_v3.1', label: { zh: '龙安阳 (男·普通话)', en: 'Longanyang (Mandarin M)' }, gender: 'male' },
  { id: 'longxiaoyan_v3.1', label: { zh: '龙晓燕 (女·普通话)', en: 'Longxiaoyan (Mandarin F)' }, gender: 'female' },
  { id: 'longyunxi_v3.1', label: { zh: '龙云溪 (男·普通话)', en: 'Longyunxi (Mandarin M)' }, gender: 'male' }
]

export const TTS_LANGUAGE_TYPES = [
  'Chinese',
  'English',
  'Japanese',
  'Korean',
  'French',
  'German',
  'Russian',
  'Italian',
  'Spanish',
  'Portuguese'
] as const

export type TtsLanguageType = (typeof TTS_LANGUAGE_TYPES)[number]

export interface ResolvedTtsEndpoint {
  url: string
  key: string
  model: TtsModelId
  requestFormat: TtsRequestFormat
  endpointKind: TtsEndpointKind
  defaultVoice?: string
  voices?: readonly TtsVoice[]
  supportsInstructions: boolean
  defaultFormat?: string
  defaultSampleRate?: number
}

// —— 端点 URL ——

/** DashScope 同步端点（旧，暂不需要 workspaceId，迟早废弃） */
const DASHSCOPE_SYNC_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

/** MAAS SpeechSynthesizer 端点（新，需要 workspaceId，所有新模型共用） */
const MAAS_TTS_URL_TEMPLATE = 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer'

const TTS_MODELS: Readonly<Record<TtsModelId, TtsModelPreset>> = {
  // —— 旧模型（DashScope 端点）——
  'qwen3-tts-flash': {
    endpointKind: 'dashscope',
    requestFormat: 'dashscope-sync',
    defaultVoice: 'Cherry',
    voices: TTS_VOICES_LEGACY
  },
  'qwen3-tts-instruct-flash': {
    endpointKind: 'dashscope',
    requestFormat: 'dashscope-sync',
    defaultVoice: 'Cherry',
    voices: TTS_VOICES_LEGACY,
    supportsInstructions: true
  },

  // —— 新模型（MAAS 端点）——
  'qwen-audio-3.1-tts-flash': {
    endpointKind: 'maas',
    requestFormat: 'maas-simple',
    defaultVoice: 'longanhuan_v3.1',
    voices: TTS_VOICES_MAAS,
    supportsInstructions: true,
    defaultFormat: 'wav',
    defaultSampleRate: 24000
  },
  'qwen-audio-3.1-tts-next': {
    endpointKind: 'maas',
    requestFormat: 'maas-audiogen',
    defaultFormat: 'wav',
    defaultSampleRate: 24000
  }
}

export const TTS_MODEL_IDS: readonly TtsModelId[] = Object.keys(TTS_MODELS) as TtsModelId[]

/** MAAS 端点模型（需要 workspaceId） */
export const MAAS_MODEL_IDS: readonly TtsModelId[] = TTS_MODEL_IDS.filter(
  m => TTS_MODELS[m].endpointKind === 'maas'
)

/** DashScope 端点模型（暂不需要 workspaceId） */
export const DASHSCOPE_MODEL_IDS: readonly TtsModelId[] = TTS_MODEL_IDS.filter(
  m => TTS_MODELS[m].endpointKind === 'dashscope'
)

export const DEFAULT_TTS_MODEL: TtsModelId = 'qwen-audio-3.1-tts-flash'

/** 是否 MAAS 端点模型（需要 workspaceId） */
export function isMaasModel(model: TtsModelId): boolean {
  return TTS_MODELS[model].endpointKind === 'maas'
}

/** 是否支持参考音频音色克隆（仅 qwen-audio-3.1-tts-next） */
export function isAudioGenModel(model: TtsModelId): boolean {
  return TTS_MODELS[model].requestFormat === 'maas-audiogen'
}

export function resolveTtsEndpoint(
  model: TtsModelId = DEFAULT_TTS_MODEL,
  workspaceId: string = ''
): ResolvedTtsEndpoint {
  const key = readImageProviderKey('dashscope')
  const preset = TTS_MODELS[model] ?? TTS_MODELS[DEFAULT_TTS_MODEL]

  const url = preset.endpointKind === 'maas'
    ? MAAS_TTS_URL_TEMPLATE.replace('{WorkspaceId}', workspaceId)
    : DASHSCOPE_SYNC_URL

  return {
    url,
    key,
    model,
    requestFormat: preset.requestFormat,
    endpointKind: preset.endpointKind,
    defaultVoice: preset.defaultVoice,
    voices: preset.voices,
    supportsInstructions: preset.supportsInstructions ?? false,
    defaultFormat: preset.defaultFormat,
    defaultSampleRate: preset.defaultSampleRate
  }
}
