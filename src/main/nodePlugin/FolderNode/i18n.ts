import type { LocalizedText } from '../../../shared/language'

/**
 * Folder 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  fileCount: {
    zh: '{n} 个文件',
    en: '{n} files'
  },
  resizeHint: {
    zh: '拖动调整文件夹大小（最小 2×2）',
    en: 'Drag to resize the folder (min 2×2)'
  }
} satisfies Record<string, LocalizedText>