/**
 * TTS Provider 预设：文生语音节点专用。
 *
 * 与 ImageGenNode 不同，TTS 目前只有阿里云百炼（qwen3-tts 系列）一家——
 * 百炼的 DASHSCOPE_API_KEY 跟 ImageGenNode 的 dashscope provider 共用，
 * 所以本文件直接从 ImageGenNode/providers.ts 导出 readImageProviderKey 复用，
 * 用户不需要为 TTS 单独配一遍 key。
 *
 * API 形态：非流式 POST，返回 output.audio.url（24 小时有效），下载即得 wav。
 */

import { readImageProviderKey } from '../ImageGenNode/providers'

/** TTS 支持的模型（百炼 qwen3-tts 系列） */
export type TtsModelId = 'qwen3-tts-flash' | 'qwen3-tts-instruct-flash'

export interface TtsModelPreset {
  /** 默认音色（model-level fallback，节点可覆盖） */
  defaultVoice: string
  /** 支持的音色列表；空数组 = 使用默认音色 */
  voices: readonly TtsVoice[]
  /** 是否支持 instructions 参数（指令控制语音表现力） */
  supportsInstructions?: boolean
}

export interface TtsVoice {
  /** 请求参数里用的 voice 值 */
  id: string
  /** 显示名（多语言可选；简中英优先就够了） */
  label: { zh: string; en: string }
  /** 性别 */
  gender?: 'female' | 'male'
  /** 方言/变体标记 */
  dialect?: string
}

/** 百炼 qwen3-tts 系列支持的系统音色 */
export const TTS_VOICES: readonly TtsVoice[] = [
  { id: 'Cherry', label: { zh: '樱桃 (女)', en: 'Cherry (F)' }, gender: 'female' },
  { id: 'Serena', label: { zh: '塞琳娜 (女)', en: 'Serena (F)' }, gender: 'female' },
  { id: 'Ethan', label: { zh: '伊森 (男)', en: 'Ethan (M)' }, gender: 'male' },
  { id: 'Kevin', label: { zh: '凯文 (男)', en: 'Kevin (M)' }, gender: 'male' },
  { id: 'Qing-Er', label: { zh: '晴儿 (女·普通话)', en: 'Qing-Er (Mandarin F)' }, gender: 'female' },
  { id: 'Long-Yunxi', label: { zh: '龙云溪 (男·普通话)', en: 'Long-Yunxi (Mandarin M)' }, gender: 'male' },
  { id: 'Long-Anni', label: { zh: '龙安妮 (女·普通话)', en: 'Long-Anni (Mandarin F)' }, gender: 'female' },
  { id: 'A-Li', label: { zh: '阿狸 (女·普通话)', en: 'A-Li (Mandarin F)' }, gender: 'female' }
]

/** 语言类型参数（language_type）——百炼要求与文本语种匹配以获最佳效果 */
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
  /** 实际请求地址 */
  url: string
  /** API Key（从 ImageGenNode 百炼配置复用） */
  key: string
  /** 模型 ID */
  model: TtsModelId
  /** 默认音色 */
  defaultVoice: string
  /** 是否支持指令控制（instructions 参数） */
  supportsInstructions: boolean
}

/** 百炼 qwen-tts 同步端点（和文生图 sync 同一个地址，不同请求体） */
const TTS_REQUEST_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

const TTS_MODELS: Readonly<Record<TtsModelId, TtsModelPreset>> = {
  'qwen3-tts-flash': {
    defaultVoice: 'Cherry',
    voices: TTS_VOICES
  },
  'qwen3-tts-instruct-flash': {
    defaultVoice: 'Cherry',
    voices: TTS_VOICES,
    supportsInstructions: true
  }
}

export const TTS_MODEL_IDS: readonly TtsModelId[] = Object.keys(TTS_MODELS) as TtsModelId[]

/** 默认模型 */
export const DEFAULT_TTS_MODEL: TtsModelId = 'qwen3-tts-flash'

/**
 * 组装 TTS 端点配置：key 复用 ImageGenNode 里百炼 provider 的值。
 * 如果用户没配过百炼 key，key 就是空字符串，后续发请求会报 401——
 * 这时候在 UI 上给出明确错误提示。
 */
export function resolveTtsEndpoint(model: TtsModelId = DEFAULT_TTS_MODEL): ResolvedTtsEndpoint {
  const key = readImageProviderKey('dashscope')
  const preset = TTS_MODELS[model] ?? TTS_MODELS[DEFAULT_TTS_MODEL]
  return {
    url: TTS_REQUEST_URL,
    key,
    model,
    defaultVoice: preset.defaultVoice,
    supportsInstructions: preset.supportsInstructions ?? false
  }
}
