import type { LocalizedText } from '../../../shared/language'

/**
 * ImageCompress 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖入图片节点压缩一次 · 或左侧端口接图片响应式压缩',
    en: 'Drop an image node to compress once · or connect an image to the left port for live compression'
  },
  formatHint: {
    zh: '选择导出格式（改变后按新格式重新压缩）',
    en: 'Choose export format (re-compresses with the new format)'
  },
  resultAlt: {
    zh: '压缩结果预览',
    en: 'Compressed result preview'
  },
  placeholder: {
    zh: '拖图片节点进来 · 或左侧端口接图片（≤ {size}px）',
    en: 'Drop an image node here · or connect an image to the left port (≤ {size}px)'
  },
  source: {
    zh: '原始',
    en: 'Original'
  },
  compressed: {
    zh: '压缩后',
    en: 'Compressed'
  },
  createNode: {
    zh: '生成图片文件节点',
    en: 'Create image file node'
  },
  createNodeHint: {
    zh: '以压缩结果为基础新建一个图片文件节点',
    en: 'Create a new image file node from the compressed result'
  },
  hint: {
    zh: '端口响应式 · 拖入一次性',
    en: 'Port: live · Drop: one-shot'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 설명',
    es: 'Ayuda',
    ar: 'مساعدة',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '图片压缩节点使用说明',
    en: 'Image Compress node help',
    ja: '画像圧縮ノードの使い方',
    ko: '이미지 압축 노드 사용 설명',
    es: 'Ayuda del nodo Comprimir imagen',
    ar: 'مساعدة عقدة ضغط الصورة',
    fr: 'Aide du nœud Compresser l’image',
    pt: 'Ajuda do nó Comprimir imagem',
    ru: 'Справка по узлу «Сжатие изображения»'
  }
} satisfies Record<string, LocalizedText>