import { ref } from 'vue'

/**
 * 全局语言设置（module 级单例）。
 *
 * 存储：localStorage（键 canvasdesk.language），与 useLLMSettings / useImageSettings 同一套约定。
 *
 * 初始化规则（第一次打开时）：
 * 1. 若存储项存在且是受支持的语言 → 直接使用；
 * 2. 否则读取系统当前语言，映射到受支持的语言后写入存储项；
 * 3. 系统语言不在列表内 → 兜底英语（en）；
 * 4. 繁体中文（zh-TW / zh-HK / zh-Hant…）→ 兜底简体中文（zh）。
 *
 * 目前只负责「选中 + 持久化」，真正切换界面文案等 i18n 能力后续再接。
 */

/** 支持的语言（值用简短的 BCP-47 主语言标签） */
export const LANGUAGE_OPTIONS = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English / 英文' },
  { code: 'ja', label: '日本語 / 日语' },
  { code: 'ko', label: '한국어 / 韩语' },
  { code: 'es', label: 'Español / 西班牙语' },
  { code: 'ar', label: 'العربية / 阿拉伯语' },
  { code: 'fr', label: 'Français / 法语' },
  { code: 'pt', label: 'Português / 葡萄牙语' },
  { code: 'ru', label: 'Русский / 俄语' }
] as const

export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]['code']

/** 默认兜底语言：系统语言不受支持时使用 */
const FALLBACK_LANGUAGE: LanguageCode = 'en'

const STORAGE_KEY = 'canvasdesk.language'

const SUPPORTED_CODES: readonly string[] = LANGUAGE_OPTIONS.map((o) => o.code)

/** 判断某个值是否是受支持的语言代码 */
function isSupported(code: string | null | undefined): code is LanguageCode {
  return !!code && SUPPORTED_CODES.includes(code)
}

/**
 * 把系统语言（如 zh-CN / zh-TW / en-US / de-DE）映射到受支持的语言代码。
 * 不支持的语种兜底英语；中文的各变体（含繁体）一律归到简体中文。
 */
export function resolveSystemLanguage(raw: string | undefined): LanguageCode {
  if (!raw) return FALLBACK_LANGUAGE

  const lower = raw.toLowerCase()

  // 中文各变体（zh、zh-CN、zh-TW、zh-Hant、zh-HK…）统一归到简体中文
  if (lower.startsWith('zh')) return 'zh'

  const base = lower.split('-')[0]
  return isSupported(base) ? base : FALLBACK_LANGUAGE
}

/** 读取存储项；不存在/非法时用系统语言初始化并写回 */
function loadOrInit(): LanguageCode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (isSupported(stored)) return stored

  const initial = resolveSystemLanguage(navigator.language || navigator.languages?.[0])
  localStorage.setItem(STORAGE_KEY, initial)
  return initial
}

const language = ref<LanguageCode>(loadOrInit())

/** 切换语言并持久化 */
function setLanguage(code: LanguageCode): void {
  if (!isSupported(code)) return
  language.value = code
  localStorage.setItem(STORAGE_KEY, code)
}

export function useLanguageSettings() {
  return { language, setLanguage, languageOptions: LANGUAGE_OPTIONS }
}