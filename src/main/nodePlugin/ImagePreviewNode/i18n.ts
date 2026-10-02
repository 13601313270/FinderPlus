import type { LocalizedText } from '../../../shared/language'

/**
 * ImagePreview 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '在画布内拖拽移动节点 · 拖出窗口导出图片到桌面/文件夹',
    en: 'Drag inside the canvas to move · drag outside the window to export the image to the desktop/folder'
  },
  needSourceHint: {
    zh: '请先连接图片来源',
    en: 'Connect an image source first'
  },
  altPreview: {
    zh: '图片预览',
    en: 'Image preview'
  },
  waitingInput: {
    zh: '等待图片输入',
    en: 'Waiting for image input'
  },
  loading: {
    zh: '图片加载中…',
    en: 'Loading image…'
  },
  createNode: {
    zh: '新建图片文件节点',
    en: 'Create image file node'
  },
  createNodeHint: {
    zh: '点击在当前节点旁边新建图片文件节点',
    en: 'Click to create an image file node next to this one'
  },
  resizeHint: {
    zh: '拖拽调整预览大小（保持图片比例）',
    en: 'Drag to resize the preview (keeps image ratio)'
  },
  formatUnknown: {
    zh: '未知',
    en: 'Unknown'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 설명',
    es: 'Ayuda',
    ar: 'تعليمات الاستخدام',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '图片预览节点使用说明',
    en: 'Image Preview node help',
    ja: '画像プレビューノードの使い方',
    ko: '이미지 미리보기 노드 사용 설명',
    es: 'Ayuda del nodo Vista previa de imagen',
    ar: 'تعليمات عقدة معاينة الصورة',
    fr: 'Aide du nœud Aperçu d’image',
    pt: 'Ajuda do nó Pré-visualizar imagem',
    ru: 'Справка по узлу «Предпросмотр изображения»'
  }
} satisfies Record<string, LocalizedText>