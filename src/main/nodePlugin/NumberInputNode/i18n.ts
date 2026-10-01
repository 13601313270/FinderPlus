import type { LocalizedText } from '../../../shared/language'

/**
 * NumberInput 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node'
  },
  placeholder: {
    zh: '输入数字…',
    en: 'Enter a number…'
  }
} satisfies Record<string, LocalizedText>