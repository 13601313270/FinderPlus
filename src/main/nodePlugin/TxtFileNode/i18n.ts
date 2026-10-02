import type { LocalizedText } from '../../../shared/language'

/**
 * TxtFile 节点卡片内的全部文案。
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
    zh: '文本文件节点使用说明',
    en: 'Text file node help',
    ja: 'テキストファイルノードの使い方',
    ko: '텍스트 파일 노드 사용 설명',
    es: 'Ayuda del nodo Archivo de texto',
    ar: 'تعليمات عقدة ملف النص',
    fr: 'Aide du nœud Fichier texte',
    pt: 'Ajuda do nó Ficheiro de texto',
    ru: 'Справка по узлу «Текстовый файл»'
  }
} satisfies Record<string, LocalizedText>