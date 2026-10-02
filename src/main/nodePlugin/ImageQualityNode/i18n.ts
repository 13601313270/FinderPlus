import type { LocalizedText } from '../../../shared/language'

/**
 * ImageQuality 节点卡片内的全部文案。
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
    zh: '选择导出格式（改变后重新压缩）',
    en: 'Choose export format (re-compresses on change)'
  },
  resultAlt: {
    zh: '压缩结果预览',
    en: 'Compressed result preview'
  },
  placeholder: {
    zh: '拖图片节点进来 · 或左侧端口接图片',
    en: 'Drop an image node here · or connect an image to the left port'
  },
  qualityLabel: {
    zh: '质量',
    en: 'Quality'
  },
  sliderHint: {
    zh: '调整压缩质量（松手后重新压缩）',
    en: 'Adjust compression quality (re-compresses on release)'
  },
  hint: {
    zh: '端口响应式 · 拖入一次性',
    en: 'Port: live · Drop: one-shot'
  },
  createNode: {
    zh: '生成图片文件节点',
    en: 'Create image file node'
  },
  createNodeHint: {
    zh: '以压缩结果为基础新建一个图片文件节点',
    en: 'Create a new image file node from the compressed result'
  },
  errorUnsupported: {
    zh: '压缩失败：不支持的图片格式或文件已损坏',
    en: 'Compression failed: unsupported image format or corrupted file'
  },
  errorWasm: {
    zh: '压缩失败：wasm 初始化或编码出错',
    en: 'Compression failed: wasm init or encoding error'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 안내',
    es: 'Ayuda',
    ar: 'تعليمات',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '图片质量节点使用说明',
    en: 'Image Quality node help',
    ja: '画像品質ノードの使い方',
    ko: '이미지 품질 노드 사용 안내',
    es: 'Ayuda del nodo Calidad de imagen',
    ar: 'تعليمات عقدة جودة الصورة',
    fr: 'Aide du nœud Qualité d’image',
    pt: 'Ajuda do nó Qualidade de imagem',
    ru: 'Справка по узлу «Качество изображения»'
  }
} satisfies Record<string, LocalizedText>