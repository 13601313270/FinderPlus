import type { LocalizedText } from '../../../shared/language'

/**
 * ImageToPdf 节点卡片内的全部文案。
 * 先配中文和英文，其他语言运行时会自动兜底到英语。
 */
export const messages = {
  imagesConnected: {
    zh: '已连接 {connected}/{total} 张图片',
    en: '{connected}/{total} images connected'
  },
  generateBtn: {
    zh: '生成 PDF',
    en: 'Generate PDF'
  },
  generating: {
    zh: '生成中…',
    en: 'Generating…'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help'
  },
  helpDialogTitle: {
    zh: '图片转 PDF 节点使用说明',
    en: 'Images to PDF node help'
  }
} satisfies Record<string, LocalizedText>
