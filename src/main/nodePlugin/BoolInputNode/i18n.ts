import type { LocalizedText } from '../../../shared/language'

/**
 * BoolInput 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node'
  },
  clickToOpen: {
    zh: '点击开启',
    en: 'Click to turn on'
  },
  clickToClose: {
    zh: '点击关闭',
    en: 'Click to turn off'
  }
} satisfies Record<string, LocalizedText>