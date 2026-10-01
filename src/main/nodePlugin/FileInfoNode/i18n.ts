import type { LocalizedText } from '../../../shared/language'

/**
 * FileInfo 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node'
  },
  labelName: {
    zh: '名称',
    en: 'Name'
  },
  labelSize: {
    zh: '大小',
    en: 'Size'
  },
  labelType: {
    zh: '类型',
    en: 'Type'
  },
  empty: {
    zh: '（暂无输入）',
    en: '(No input)'
  }
} satisfies Record<string, LocalizedText>