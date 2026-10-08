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
  pageSizeLabel: {
    zh: '页面',
    en: 'Page'
  },
  marginLabel: {
    zh: '边距',
    en: 'Margin'
  },
  marginHint: {
    zh: 'PDF points（上下左右各一份，0 = 铺满）',
    en: 'PDF points (applies to all sides, 0 = no padding)'
  },
  fitModeLabel: {
    zh: '适配方式',
    en: 'Fit'
  },
  fitMode_contain: {
    zh: 'Contain（完整显示）',
    en: 'Contain (fit with whitespace)'
  },
  fitMode_fill: {
    zh: 'Fill（拉伸铺满）',
    en: 'Fill (stretch to fill)'
  },
  fitMode_cover: {
    zh: 'Cover（裁剪铺满）',
    en: 'Cover (crop to fill)'
  },
  fitModeHint_contain: {
    zh: '等比缩放，完整显示图片，留白',
    en: 'Keep aspect, show full image, may leave whitespace'
  },
  fitModeHint_fill: {
    zh: '拉伸铺满整个页面，可能变形',
    en: 'Stretch to fill, image may be distorted'
  },
  fitModeHint_cover: {
    zh: '等比缩放铺满，裁剪溢出部分',
    en: 'Keep aspect, crop overflow, no whitespace'
  },
  settingsTitle: {
    zh: '设置 · 详情面板',
    en: 'Settings · Detail Panel'
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
