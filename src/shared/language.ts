/**
 * 界面语言的单一真相源。
 *
 * 放在 shared 是因为它同时被两侧消费：
 * - 主进程：节点插件的多语言标题（NodePluginManifest.title）要按语言代码取词；
 * - 渲染进程：useLanguageSettings 的语言下拉、i18n 词条注册表。
 *
 * 两边共用同一份语言码，新增语言时只需在这里加一项，
 * 渲染侧的下拉标签表和词条注册表都会因类型约束而被迫补齐（漏了会编译报错）。
 */

/** 支持的语言代码（BCP-47 主语言标签），数组顺序即设置页下拉的展示顺序 */
export const LANGUAGE_CODES = ['zh', 'en', 'ja', 'ko', 'es', 'ar', 'fr', 'pt', 'ru'] as const

export type LanguageCode = (typeof LANGUAGE_CODES)[number]

/**
 * 多语言文案表：可只配若干语言（比如只配 zh + en），未配的语言交给 resolveLocalizedText 兜底。
 * 节点标题（NodeTitle）、端口标签等可翻译文本都复用这一份类型，避免各处重复定义。
 */
export type LocalizedText = Partial<Record<LanguageCode, string>>

/**
 * 解析多语言文案。兜底顺序：目标语言 → 英语 → 表里第一个配了的语言 → fallback。
 * 传入 string 时原样返回，用于兼容尚未迁移为多语言的旧标签（如 OutputPort 的 label）。
 */
export function resolveLocalizedText(
  text: LocalizedText | string | undefined,
  locale: LanguageCode,
  fallback: string
): string {
  if (text === undefined) return fallback
  if (typeof text === 'string') return text
  return text[locale] ?? text.en ?? Object.values(text)[0] ?? fallback
}