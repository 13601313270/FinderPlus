import type { LocalizedText } from '../../../shared/language'

/**
 * JsonDisplay 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node'
  },
  noInput: {
    zh: '（暂无输入）',
    en: '(No input yet)'
  },
  parseErrorTitle: {
    zh: 'JSON 解析失败',
    en: 'JSON parse failed'
  },
  emptyInput: {
    zh: '（空输入）',
    en: '(Empty input)'
  },
  resizeHint: {
    zh: '拖拽调整节点大小',
    en: 'Drag to resize the node'
  },
  collapse: {
    zh: '收起',
    en: 'Collapse'
  },
  expand: {
    zh: '展开',
    en: 'Expand'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help'
  },
  helpDialogTitle: {
    zh: 'JSON 展示节点使用说明',
    en: 'JSON Display node help'
  }
} satisfies Record<string, LocalizedText>