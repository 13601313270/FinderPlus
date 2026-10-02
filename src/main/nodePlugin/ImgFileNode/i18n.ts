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
    zh: '图片文件节点使用说明',
    en: 'Image file node help',
    ja: '画像ファイルノードの使い方',
    ko: '이미지 파일 노드 사용 설명',
    es: 'Ayuda del nodo Archivo de imagen',
    ar: 'تعليمات عقدة ملف الصورة',
    fr: 'Aide du nœud Fichier image',
    pt: 'Ajuda do nó Ficheiro de imagem',
    ru: 'Справка по узлу «Файл изображения»'
  }
} satisfies Record<string, LocalizedText>