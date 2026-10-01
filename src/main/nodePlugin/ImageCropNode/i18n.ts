import type { LocalizedText } from '../../../shared/language'

/**
 * ImageCrop 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖入图片节点裁剪 · 或左侧端口接图片响应式',
    en: 'Drop an image node to crop · or connect an image to the left port for live cropping'
  },
  placeholder: {
    zh: '拖图片节点进来 · 或左侧端口接图片',
    en: 'Drop an image node here · or connect an image to the left port'
  },
  sourceAlt: {
    zh: '源图',
    en: 'Source image'
  },
  croppedBadge: {
    zh: '已裁剪 ✓',
    en: 'Cropped ✓'
  },
  autoCrop: {
    zh: '自动裁剪',
    en: 'Auto crop'
  },
  autoCropHint: {
    zh: '自动裁剪：开启后拖动裁剪框自动执行裁剪',
    en: 'Auto crop: crop automatically after dragging the crop box'
  },
  confirmCrop: {
    zh: '确认裁剪',
    en: 'Confirm crop'
  },
  createNode: {
    zh: '生成图片文件节点',
    en: 'Create image file node'
  }
} satisfies Record<string, LocalizedText>