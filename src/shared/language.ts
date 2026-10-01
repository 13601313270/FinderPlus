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