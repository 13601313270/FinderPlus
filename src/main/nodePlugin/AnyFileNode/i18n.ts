import type { LocalizedText } from '../../../shared/language'

/**
 * AnyFile 节点卡片内的全部文案。
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点 · 拖出窗口移动文件 · 双击用系统默认应用打开',
    en: 'Drag node · drag out of the window to move the file · double-click to open with the system default app'
  },
  dragHintEmpty: { zh: '拖动节点（未选文件）', en: 'Drag node (no file selected)' },
  emptyFile: { zh: '未选择文件', en: 'No file selected' },
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
    zh: '任意文件节点使用说明',
    en: 'Any file node help',
    ja: '汎用ファイルノードの使い方',
    ko: '범용 파일 노드 사용 설명',
    es: 'Ayuda del nodo Archivo genérico',
    ar: 'تعليمات عقدة الملف العام',
    fr: 'Aide du nœud Fichier générique',
    pt: 'Ajuda do nó Ficheiro genérico',
    ru: 'Справка по узлу «Обычный файл»'
  }
} satisfies Record<string, LocalizedText>