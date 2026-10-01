import type { LocalizedText } from '../../../shared/language'

/**
 * TextDisplay 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node'
  },
  empty: {
    zh: '（暂无输出）',
    en: '(No output)'
  },
  nodeMissing: {
    zh: '节点不存在',
    en: 'Node not found'
  },
  resizeHint: {
    zh: '拖拽调整节点大小',
    en: 'Drag to resize the node'
  }
} satisfies Record<string, LocalizedText>