/**
 * TTS Provider 预设：文生语音节点专用。
 *
 * 阿里云有两套独立计费 / 独立端点的服务：
 *
 *  1) 阿里云百炼 (dashscope) —— DashScope 按量付费
 *     host: dashscope.aliyuncs.com（旧）或 {WorkspaceId}.cn-beijing.maas.aliyuncs.com（新）
 *     Key 前缀：sk-
 *     支持的模型：qwen3-tts-flash / qwen3-tts-instruct-flash / qwen-audio-3.1-tts-flash / qwen-audio-3.1-tts-plus / qwen-audio-3.1-tts-next
 *     qwen-audio-3.1-tts-plus/flash 支持：系统音色 + 复刻音色（customization API 先注册 voice_id，合成时 voice 字段直接引用）
 *     qwen-audio-3.1-tts-next 支持参考音频 audiogen 模式（每次请求内联 references）
 *
 *  2) 千问 Token Plan (tokenplan) —— 独立计费
 *     host: token-plan.cn-beijing.maas.aliyuncs.com
 *     Key 前缀：sk-sp-
 *     支持的模型：qwen3-tts-flash / qwen-audio-3.0-tts-flash / qwen-audio-3.0-tts-plus
 *     端点只认 simple 格式（text + voice），**不支持 audiogen / 参考音频克隆**
 *
 * 音色复刻：DashScope 专属，先调 customization API 注册音色，再用返回的 voice_id 合成。
 *   endpoint: POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/customization
 *   model:    voice-enrollment
 *   action:   create_voice / list_voice / query_voice / update_voice / delete_voice
 */

import { readImageProviderKey, type ImageProviderId } from '../ImageGenNode/providers'

/** TTS provider 复用 ImageGenNode 的 provider id（共用同一个 API Key 存储） */
export type TtsProviderId = Extract<ImageProviderId, 'dashscope' | 'tokenplan'>

// —— DashScope 按量付费的模型 ID ——
export type DashscopeLegacyModelId = 'qwen3-tts-flash' | 'qwen3-tts-instruct-flash'
export type DashscopeMaasSimpleModelId = 'qwen-audio-3.1-tts-flash' | 'qwen-audio-3.1-tts-plus'
export type DashscopeMaasAudioGenModelId = 'qwen-audio-3.1-tts-next'
export type DashscopeTtsModelId = DashscopeLegacyModelId | DashscopeMaasSimpleModelId | DashscopeMaasAudioGenModelId

// —— Token Plan 的模型 ID ——
export type TokenPlanSimpleModelId = 'qwen3-tts-flash' | 'qwen-audio-3.0-tts-flash' | 'qwen-audio-3.0-tts-plus'
export type TokenPlanTtsModelId = TokenPlanSimpleModelId

/** 请求体格式 —— 两套 API 体系各自独立枚举，互不混淆 */
export type TtsRequestFormat =
  | 'dashscope-sync'      // DashScope 旧端点 multimodal-generation（qwen3-tts-flash / instruct-flash）
  | 'dashscope-maas'      // DashScope MAAS SpeechSynthesizer simple（qwen-audio-3.1-tts-flash / plus，支持 instruction，支持复刻 voice_id）
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
  /** 音色列表（系统音色，从官方音色表抄） */
  voices?: readonly TtsVoice[]
  /** 是否支持 instructions */
  supportsInstructions?: boolean
  /** MAAS 端点的输出格式（wav / mp3 等） */
  defaultFormat?: string
  /** MAAS 端点的采样率 */
  defaultSampleRate?: number
  /** 是否支持参考音频音色克隆（仅 DashScope 的 qwen-audio-3.1-tts-next 支持 audiogen 内联） */
  supportsReferenceAudio?: boolean
  /** 是否支持复刻音色（customization API 先注册 voice_id 再引用） */
  supportsCustomVoice?: boolean
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

// DashScope MAAS qwen-audio-3.1-tts-plus（旗舰音色，4 个）
export const TTS_VOICES_DASHSCOPE_PLUS: readonly TtsVoice[] = [
  { id: 'longanlingxin_v3.1', label: { zh: '龙安灵心 (女)', en: 'Longanlingxin (F)' }, gender: 'female' },
  { id: 'xunanchuan_v3.1', label: { zh: '许南川 (男)', en: 'Xunanchuan (M)' }, gender: 'male' },
  { id: 'longanhuan_v3.1', label: { zh: '龙安欢 (女)', en: 'Longanhuan (F)' }, gender: 'female' },
  { id: 'longanfengyue_v3.1', label: { zh: '龙安风悦 (女)', en: 'Longanfengyue (F)' }, gender: 'female' }
]

// DashScope MAAS qwen-audio-3.1-tts-flash（完整系统音色列表）
// 来源: https://platform.qianwenai.com/docs/developer-guides/speech/voice-list/qwen-audio-tts
export const TTS_VOICES_DASHSCOPE_FLASH: readonly TtsVoice[] = [
  // 多语种与方言（4 个，支持全部方言和小语种）
  { id: 'longanhuan_v3.1', label: { zh: '龙安欢 (女·多语种)', en: 'Longanhuan (Multi-lang F)' }, gender: 'female' },
  { id: 'longanlingxin_v3.1', label: { zh: '龙安灵心 (女·多语种)', en: 'Longanlingxin (Multi-lang F)' }, gender: 'female' },
  { id: 'longanfengyue_v3.1', label: { zh: '龙安风悦 (女·多语种)', en: 'Longanfengyue (Multi-lang F)' }, gender: 'female' },
  { id: 'xunanchuan_v3.1', label: { zh: '许南川 (男·多语种)', en: 'Xunanchuan (Multi-lang M)' }, gender: 'male' },

  // 精品中文（仅普通话）
  { id: 'yuxiaoyun_v3.1', label: { zh: '于小云 (女)', en: 'Yuxiaoyun (F)' }, gender: 'female' },
  { id: 'qiaoxiaojiao_v3.1', label: { zh: '乔小娇 (女)', en: 'Qiaoxiaojiao (F)' }, gender: 'female' },
  { id: 'xiaxiaochen_v3.1', label: { zh: '夏小晨 (女)', en: 'Xiaxiaochen (F)' }, gender: 'female' },
  { id: 'anmingyuan_v3.1', label: { zh: '安明远 (男)', en: 'Anmingyuan (M)' }, gender: 'male' },
  { id: 'wenhuaiqing_v3.1', label: { zh: '温怀清 (女)', en: 'Wenhuaiqing (F)' }, gender: 'female' },
  { id: 'anxiaolan_v3.1', label: { zh: '安小岚 (女)', en: 'Anxiaolan (F)' }, gender: 'female' },
  { id: 'xieshurou_v3.1', label: { zh: '谢舒柔 (女)', en: 'Xieshurou (F)' }, gender: 'female' },
  { id: 'baiqinglan_v3.1', label: { zh: '白清岚 (女)', en: 'Baiqinglan (F)' }, gender: 'female' },
  { id: 'xuyuyuan_v3.1', label: { zh: '许玉远 (女)', en: 'Xuyuyuan (F)' }, gender: 'female' },
  { id: 'anruorou_v3.1', label: { zh: '安若柔 (女)', en: 'Anruorou (F)' }, gender: 'female' },
  { id: 'wenhuaizhi_v3.1', label: { zh: '闻怀之 (女)', en: 'Wenhuaizhi (F)' }, gender: 'female' },
  { id: 'xiaoxingzhi_v3.1', label: { zh: '萧行之 (女)', en: 'Xiaoxingzhi (F)' }, gender: 'female' },
  { id: 'guyunshu_v3.1', label: { zh: '顾云舒 (女)', en: 'Guyunshu (F)' }, gender: 'female' },
  { id: 'huozhuoshi_v3.1', label: { zh: '霍拙石 (男)', en: 'Huozhuoshi (M)' }, gender: 'male' },
  { id: 'yeqinghe_v3.1', label: { zh: '叶清禾 (女)', en: 'Yeqinghe (F)' }, gender: 'female' },
  { id: 'yunhuanhuan_v3.1', label: { zh: '云欢欢 (女)', en: 'Yunhuanhuan (F)' }, gender: 'female' },
  { id: 'xuxiaoqiao_v3.1', label: { zh: '徐小俏 (女)', en: 'Xuxiaoqiao (F)' }, gender: 'female' },
  { id: 'baianran_v3.1', label: { zh: '白安然 (女)', en: 'Baianran (F)' }, gender: 'female' },
  { id: 'xuyanchu_v3.1', label: { zh: '许言初 (女)', en: 'Xuyanchu (F)' }, gender: 'female' },
  { id: 'yezhiqing_v3.1', label: { zh: '叶知晴 (女)', en: 'Yezhiqing (F)' }, gender: 'female' },
  { id: 'andi_v3.1', label: { zh: '安迪 (男·ABC)', en: 'Andy (ABC M)' }, gender: 'male' },
  { id: 'anyuqing_v3.1', label: { zh: '安语晴 (女·甜妹)', en: 'Anyuqing (Sweet F)' }, gender: 'female' },
  { id: 'linxiaoling_v3.1', label: { zh: '林小灵 (女·甜妹)', en: 'Linxiaoling (Sweet F)' }, gender: 'female' },

  // 英文音色
  { id: 'Emily_v3.1', label: { zh: 'Emily (英式女)', en: 'Emily (UK F)' }, gender: 'female' },
  { id: 'Luna_v3.1', label: { zh: 'Luna (英式女)', en: 'Luna (UK F)' }, gender: 'female' },
  { id: 'Eric_v3.1', label: { zh: 'Eric (英式男)', en: 'Eric (UK M)' }, gender: 'male' },
  { id: 'Luca_v3.1', label: { zh: 'Luca (英式男)', en: 'Luca (UK M)' }, gender: 'male' },
  { id: 'Abby_v3.1', label: { zh: 'Abby (美式女)', en: 'Abby (US F)' }, gender: 'female' },
  { id: 'Annie_v3.1', label: { zh: 'Annie (美式女)', en: 'Annie (US F)' }, gender: 'female' },
  { id: 'Ava_v3.1', label: { zh: 'Ava (美式女)', en: 'Ava (US F)' }, gender: 'female' },
  { id: 'Beth_v3.1', label: { zh: 'Beth (美式女)', en: 'Beth (US F)' }, gender: 'female' },
  { id: 'Betty_v3.1', label: { zh: 'Betty (美式女)', en: 'Betty (US F)' }, gender: 'female' },
  { id: 'Cally_v3.1', label: { zh: 'Cally (美式女)', en: 'Cally (US F)' }, gender: 'female' },
  { id: 'Cindy_v3.1', label: { zh: 'Cindy (美式女)', en: 'Cindy (US F)' }, gender: 'female' },
  { id: 'Donna_v3.1', label: { zh: 'Donna (美式女)', en: 'Donna (US F)' }, gender: 'female' },
  { id: 'Andy_v3.1', label: { zh: 'Andy (美式男)', en: 'Andy (US M)' }, gender: 'male' },
  { id: 'Brian_v3.1', label: { zh: 'Brian (美式男)', en: 'Brian (US M)' }, gender: 'male' },
  { id: 'David_v3.1', label: { zh: 'David (美式男)', en: 'David (US M)' }, gender: 'male' },

  // 特色 / 角色音 / 有声书 / 新闻播报 / 童声 / 诗词朗诵 等
  { id: 'longanyuanfei_v3.1', label: { zh: '龙安元妃 (女·高傲妃子)', en: 'Longanyuanfei (F)' }, gender: 'female' },
  { id: 'longjielidou_v3.1', label: { zh: '龙杰力豆 (男·天真童声)', en: 'Longjielidou (M)' }, gender: 'male' },
  { id: 'longanlingxi_v3.1', label: { zh: '龙安灵希 (女·可爱甜美)', en: 'Longanlingxi (F)' }, gender: 'female' },
  { id: 'longhuohuo_v3.1', label: { zh: '龙火火 (男·顽皮少年)', en: 'Longhuohuo (M)' }, gender: 'male' },
  { id: 'longyingtao_v3.1', label: { zh: '龙应桃 (女·温柔淡定)', en: 'Longyingtao (F)' }, gender: 'female' },
  { id: 'longanya_v3.1', label: { zh: '龙安雅 (女·高雅气质)', en: 'Longanya (F)' }, gender: 'female' },
  { id: 'longwan_v3.1', label: { zh: '龙婉 (女·细腻柔声)', en: 'Longwan (F)' }, gender: 'female' },
  { id: 'longxing_v3.1', label: { zh: '龙星 (女·温婉邻家)', en: 'Longxing (F)' }, gender: 'female' },
  { id: 'longhua_v3.1', label: { zh: '龙华 (女·元气甜美)', en: 'Longhua (F)' }, gender: 'female' },
  { id: 'longhan_v3.1', label: { zh: '龙寒 (男·温暖痴情)', en: 'Longhan (M)' }, gender: 'male' },
  { id: 'longanzhi_v3.1', label: { zh: '龙安智 (男·睿智轻熟)', en: 'Longanzhi (M)' }, gender: 'male' },
  { id: 'longzhe_v3.1', label: { zh: '龙哲 (男·呆板大暖)', en: 'Longzhe (M)' }, gender: 'male' },
  { id: 'longanyang_v3.1', label: { zh: '龙安阳 (男·阳光大男孩)', en: 'Longanyang (M)' }, gender: 'male' },
  { id: 'libai_v3.1', label: { zh: '李白 (男·诗仙)', en: 'Libai (M)' }, gender: 'male' },
  { id: 'longfeifei_v3.1', label: { zh: '龙菲菲 (女·甜妹)', en: 'Longfeifei (F)' }, gender: 'female' },
  { id: 'longjing_v3.1', label: { zh: '龙婧 (女·质感沉稳)', en: 'Longjing (F)' }, gender: 'female' },
  { id: 'longqiang_v3.1', label: { zh: '龙嫱 (女·浪漫风情)', en: 'Longqiang (F)' }, gender: 'female' },
  { id: 'longyan_v3.1', label: { zh: '龙颜 (女·温暖自然)', en: 'Longyan (F)' }, gender: 'female' },
  { id: 'longxiaobai_v3.1', label: { zh: '龙小白 (女·磁性新闻)', en: 'Longxiaobai (F)' }, gender: 'female' },
  { id: 'longyue_v3.1', label: { zh: '龙悦 (女·温暖磁性)', en: 'Longyue (F)' }, gender: 'female' },
  { id: 'longcheng_v3.1', label: { zh: '龙橙 (男·智慧磁性)', en: 'Longcheng (M)' }, gender: 'male' },
  { id: 'longlaotie_v3.1', label: { zh: '龙老铁 (男·东北直率)', en: 'Longlaotie (M)' }, gender: 'male' },
  { id: 'longshao_v3.1', label: { zh: '龙邵 (男·积极元气)', en: 'Longshao (M)' }, gender: 'male' },
  { id: 'longshu_v3.1', label: { zh: '龙书 (男·沉稳磁性)', en: 'Longshu (M)' }, gender: 'male' },
  { id: 'longze_v3.1', label: { zh: '龙泽 (男·温暖元气)', en: 'Longze (M)' }, gender: 'male' },
  { id: 'longhao_v3.1', label: { zh: '龙浩 (男·多情忧郁)', en: 'Longhao (M)' }, gender: 'male' },
  { id: 'longjin_v3.1', label: { zh: '龙津 (男·优雅温润)', en: 'Longjin (M)' }, gender: 'male' },
  { id: 'longnan_v3.1', label: { zh: '龙楠 (男·睿智)', en: 'Longnan (M)' }, gender: 'male' },
  { id: 'longshuo_v3.1', label: { zh: '龙硕 (男·博才干练)', en: 'Longshuo (M)' }, gender: 'male' },
  { id: 'longtian_v3.1', label: { zh: '龙天 (男·磁性理智)', en: 'Longtian (M)' }, gender: 'male' },
  { id: 'longxiaocheng_v3.1', label: { zh: '龙小诚 (男·磁性低音)', en: 'Longxiaocheng (M)' }, gender: 'male' },
  { id: 'longke_v3.1', label: { zh: '龙可 (儿童·懵懂)', en: 'Longke (Child)' } },
  { id: 'longling_v3.1', label: { zh: '龙铃 (女·稚气呆板)', en: 'Longling (F)' }, gender: 'female' },
  { id: 'longniuniu_v3.1', label: { zh: '龙牛牛 (男·阳光童声)', en: 'Longniuniu (M)' }, gender: 'male' },
  { id: 'longshanshan_v3.1', label: { zh: '龙闪闪 (男·戏剧化童声)', en: 'Longshanshan (M)' }, gender: 'male' },
  { id: 'longpaopao_v3.1', label: { zh: '龙泡泡 (女·飞天泡泡)', en: 'Longpaopao (F)' }, gender: 'female' },
  { id: 'loongbella_v3.1', label: { zh: 'Bella (女·中英文)', en: 'Bella (CN/EN F)' }, gender: 'female' },
  { id: 'loongstella_v3.1', label: { zh: 'Stella (女·飒爽新闻)', en: 'Stella (F)' }, gender: 'female' },
  { id: 'longyuan_v3.1', label: { zh: '龙媛 (女·温暖治愈)', en: 'Longyuan (F)' }, gender: 'female' },
  { id: 'longmiao_v3.1', label: { zh: '龙妙 (女·抑扬顿挫)', en: 'Longmiao (F)' }, gender: 'female' },
  { id: 'longsanshu_v3.1', label: { zh: '龙三叔 (男·沉稳质感)', en: 'Longsanshu (M)' }, gender: 'male' },
  { id: 'longanli_v3.1', label: { zh: '龙安莉 (女·利落从容)', en: 'Longanli (F)' }, gender: 'female' },
  { id: 'longanwen_v3.1', label: { zh: '龙安温 (女·优雅知性)', en: 'Longanwen (F)' }, gender: 'female' },
  { id: 'longanlang_v3.1', label: { zh: '龙安朗 (男·清爽利落)', en: 'Longanlang (M)' }, gender: 'male' },
  { id: 'longxiaoxia_v3.1', label: { zh: '龙小夏 (女·沉稳权威)', en: 'Longxiaoxia (F)' }, gender: 'female' },
  { id: 'longanchong_v3.1', label: { zh: '龙安冲 (男·激情推销)', en: 'Longanchong (M)' }, gender: 'male' }
]

// Token Plan SpeechSynthesizer（qwen-audio-3.0 系列，CosyVoice 引擎，voice ID 无 _v3.1 后缀）
export const TTS_VOICES_TOKENPLAN: readonly TtsVoice[] = [
  { id: 'longanlingxin', label: { zh: '龙安灵心 (女·普通话)', en: 'Longanlingxin (Mandarin F)' }, gender: 'female' },
  { id: 'longanlingxi', label: { zh: '龙安灵希 (女·普通话)', en: 'Longanlingxi (Mandarin F)' }, gender: 'female' },
  { id: 'longanqian', label: { zh: '龙安千 (女·普通话)', en: 'Longanqian (Mandarin F)' }, gender: 'female' },
  { id: 'longanxiaoxin', label: { zh: '龙安小芯 (女·普通话)', en: 'Longanxiaoxin (Mandarin F)' }, gender: 'female' },
  { id: 'longanlufeng', label: { zh: '龙安陆风 (男·普通话)', en: 'Longanlufeng (Mandarin M)' }, gender: 'male' }
]

// —— 复刻音色数据结构 ——

/** 音色状态（customization API 返回） */
export type CustomVoiceStatus = 'DEPLOYING' | 'OK' | 'UNDEPLOYED'

/** 复刻音色（来自 customization API list_voice 响应） */
export interface CustomVoice {
  voice_id: string
  gmt_create?: string
  gmt_modified?: string
  status?: CustomVoiceStatus
  target_model?: string
  resource_link?: string
}

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
/** 音色复刻 customization API（DashScope MAAS 端点） */
export const DASHSCOPE_CUSTOMIZATION_URL_TEMPLATE = 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/customization'
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
    voices: TTS_VOICES_DASHSCOPE_FLASH,
    supportsInstructions: true,
    defaultFormat: 'wav',
    defaultSampleRate: 24000,
    supportsCustomVoice: true
  },
  'qwen-audio-3.1-tts-plus': {
    provider: 'dashscope',
    endpointKind: 'maas',
    requestFormat: 'dashscope-maas',
    defaultVoice: 'longanlingxin_v3.1',
    voices: TTS_VOICES_DASHSCOPE_PLUS,
    supportsInstructions: true,
    defaultFormat: 'wav',
    defaultSampleRate: 24000,
    supportsCustomVoice: true
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
  // 注：Token Plan 的音色复刻也走 DashScope MAAS 域名的 customization API（需要 DashScope API Key + Workspace ID）
  //    但合成时仍走 Token Plan 自己的 endpoint 和 key。
  'qwen-audio-3.0-tts-plus': {
    provider: 'tokenplan',
    endpointKind: 'maas',
    requestFormat: 'tokenplan-simple',
    defaultVoice: 'longanlingxin',
    voices: TTS_VOICES_TOKENPLAN,
    defaultFormat: 'wav',
    defaultSampleRate: 24000,
    supportsCustomVoice: true
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

/** 是否支持参考音频音色克隆（仅 DashScope 的 qwen-audio-3.1-tts-next 支持 audiogen 内联） */
export function supportsReferenceAudio(model: TtsModelId): boolean {
  return TTS_MODELS[model]?.supportsReferenceAudio === true
}

/** 是否支持复刻音色（先通过 customization API 注册 voice_id，再在合成时引用） */
export function supportsCustomVoice(model: TtsModelId): boolean {
  return TTS_MODELS[model]?.supportsCustomVoice === true
}

/**
 * 判断一个 voice 字符串是不是复刻音色的 voice_id。
 *
 * 阿里云复刻 voice_id 格式：`{target_model}-{prefix}-{唯一标识}`
 * 例如 `qwen-audio-3.1-tts-plus-myvoice-xxxxxx`。
 * 系统音色 voice_id 不会带这种三段式结构（系统音色如 `longanhuan_v3.1`、`Cherry`、`Emily_v3.1`）。
 *
 * 简单启发式：voice 里出现至少 3 个 `-`，且不含 `_v` 后缀（系统音色的特征）。
 * 够用就行，不是严谨正则。
 */
export function isCustomVoiceId(voice: string): boolean {
  if (!voice) return false
  if (voice.includes('_v')) return false // 系统音色标志
  const dashes = (voice.match(/-/g) || []).length
  return dashes >= 3
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
  supportsCustomVoice: boolean
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
    defaultSampleRate: preset?.defaultSampleRate,
    supportsCustomVoice: preset?.supportsCustomVoice ?? false
  }
}

/** 解析 customization API 端点（仅 DashScope MAAS） */
export function resolveCustomizationUrl(workspaceId: string): string {
  return DASHSCOPE_CUSTOMIZATION_URL_TEMPLATE.replace('{WorkspaceId}', workspaceId)
}
