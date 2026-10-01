import { type LocalizedText, resolveLocalizedText } from '../../../shared/language'
import { useLanguageSettings } from './useLanguageSettings'

/**
 * 节点本地文案表：key → 多语言文案（LocalizedText）。
 *
 * 每个节点把自己的 UI 文案放在**自己的文件夹**里（如 ImageCompressNode/i18n.ts），
 * 而不是塞进 renderer 的全局 i18n——这样节点才能整包拿走 / 装回，往可插拔方向走。
 * 端口 label 用的也是同一份 LocalizedText，节点内文案与端口文案保持一致。
 */
export type NodeMessages = Record<string, LocalizedText>

/**
 * 解析节点本地文案表，返回 `t(key, params?)`。
 *
 * - 按当前界面语言取值，兜底交给 resolveLocalizedText（目标语言 → en → 首个已配 → key）
 * - 读取的是响应式的 language，模板里调用 t 会随语言切换自动重渲染
 * - params 支持 {name} 占位符插值
 */
export function useLocalizedMessages<M extends NodeMessages>(messages: M) {
  const { language } = useLanguageSettings()
  return (key: keyof M & string, params?: Record<string, string | number>): string => {
    const text = resolveLocalizedText(messages[key], language.value, key)
    if (!params) return text
    return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in params ? String(params[name]) : whole
    )
  }
}