import { watch } from 'vue'
import { createI18n } from 'vue-i18n'
import { useLanguageSettings, type LanguageCode } from '@renderer/composables/useLanguageSettings'
import type { Language } from './types'
import zh from './locales/zh'
import en from './locales/en'
import ja from './locales/ja'
import ko from './locales/ko'
import es from './locales/es'
import ar from './locales/ar'
import fr from './locales/fr'
import pt from './locales/pt'
import ru from './locales/ru'
import hi from './locales/hi'
import id from './locales/id'
import de from './locales/de'
import vi from './locales/vi'
import tr from './locales/tr'
import it from './locales/it'

/**
 * 全局 i18n 实例。
 *
 * 语言的**唯一来源**是 useLanguageSettings 的 language（module 级单例，负责 localStorage
 * 持久化 + 首次打开时读系统语言初始化）。这里不另存一份语言状态，只把它镜像到 i18n 的
 * 当前 locale：UI 侧改语言永远走 setLanguage，语言变化由下面的 watch 单向同步过来。
 *
 * fallbackLocale 用 en，跟 useLanguageSettings 里「系统语言不受支持时兜底英语」的规则一致；
 * 某个语言词条万一漏了 key，也会自动退回英文而不是显示 key 本身。
 */
const { language } = useLanguageSettings()

/**
 * 语言 → 词条注册表。
 *
 * 标注成 Record<LanguageCode, Language> 有两个编译期强制作用：
 * 1. 键必须覆盖 LANGUAGE_OPTIONS 里登记过的**全部**语言——新增语言（比如 LANGUAGE_OPTIONS
 *    里加了 'nl'）却忘了在这里挂词条，typecheck 直接报错；
 * 2. 每份词条都必须满足 Language 契约，全部语言结构强制一致。
 */
const messages: Record<LanguageCode, Language> = {
  zh,
  en,
  ja,
  ko,
  es,
  ar,
  fr,
  pt,
  ru,
  hi,
  id,
  de,
  vi,
  tr,
  it
}

export const i18n = createI18n({
  legacy: false,
  // 模板里可直接用 $t（组件内仍推荐 useI18n 的 t，显式且类型友好）
  globalInjection: true,
  locale: language.value,
  fallbackLocale: 'en',
  messages
})

// 语言设置变化 → 同步切换界面文案
watch(language, (code) => {
  i18n.global.locale.value = code
})

/**
 * 非组件环境取译文（纯模块，如 canvas/connectionDrag、composables/useHelpCenter）。
 * 组件内请用 useI18n() 的 t，这样语言切换时模板会自动重渲染。
 */
export function translate(key: string, named?: Record<string, unknown>): string {
  return named ? i18n.global.t(key, named) : i18n.global.t(key)
}