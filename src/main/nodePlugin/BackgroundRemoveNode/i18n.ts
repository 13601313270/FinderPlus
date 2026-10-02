import type { LocalizedText } from '../../../shared/language'

/**
 * BackgroundRemove 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖入图片节点抠图一次 · 或左侧端口接图片响应式抠图',
    en: 'Drop an image node to remove background once · or connect an image to the left port for live removal'
  },
  resultAlt: { zh: '去背景结果预览', en: 'Background-removed result preview' },
  preparing: { zh: '准备中…', en: 'Preparing…' },
  processing: { zh: '处理中 {pct}%', en: 'Processing {pct}%' },
  processingFallback: { zh: '处理中…', en: 'Processing…' },
  failed: { zh: '处理失败', en: 'Processing failed' },
  emptyPlaceholder: {
    zh: '拖图片节点进来 · 或左侧端口接图片',
    en: 'Drop an image node here · or connect an image to the left port'
  },
  done: { zh: '背景已去除', en: 'Background removed' },
  hint: { zh: '端口响应式 · 拖入一次性', en: 'Port: live · Drop: one-shot' },
  createNode: { zh: '生成图片文件节点', en: 'Create image file node' },
  createNodeHint: {
    zh: '以抠图结果为基础新建一个图片文件节点',
    en: 'Create a new image file node from the background-removed result'
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
    zh: '背景移除节点使用说明',
    en: 'Background Remove node help',
    ja: '背景除去ノードの使い方',
    ko: '배경 제거 노드 사용 설명',
    es: 'Ayuda del nodo Quitar fondo',
    ar: 'تعليمات عقدة إزالة الخلفية',
    fr: 'Aide du nœud Suppression d’arrière-plan',
    pt: 'Ajuda do nó Remover fundo',
    ru: 'Справка по узлу «Удаление фона»'
  }
} satisfies Record<string, LocalizedText>