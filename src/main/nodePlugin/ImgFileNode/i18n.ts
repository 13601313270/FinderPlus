import type { LocalizedText } from '../../../shared/language'

/**
 * ImgFile 节点卡片内的全部文案。
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点 · 拖出窗口移动文件 · 双击用系统默认应用打开',
    en: 'Drag node · drag out of the window to move the file · double-click to open with the system default app'
  },
  dragHintEmpty: { zh: '拖动节点（未选文件）', en: 'Drag node (no file selected)' },
  altPreview: { zh: '图片预览', en: 'Image preview' },
  emptyFile: { zh: '未选择文件', en: 'No file selected' },
  resizeHint: {
    zh: '拖拽调整预览大小（保持原图比例）',
    en: 'Drag to resize the preview (keeps image ratio)'
  }
} satisfies Record<string, LocalizedText>