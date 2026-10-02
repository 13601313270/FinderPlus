import type { LocalizedText } from '../../../shared/language'

/**
 * ImageGen 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点（整个头部可拖）',
    en: 'Drag node (the whole header is draggable)'
  },
  gearConfigured: {
    zh: '图像模型已配置，点击修改 Key',
    en: 'Image model configured, click to change Key'
  },
  gearConfigure: {
    zh: '点击配置图像 API Key',
    en: 'Click to configure image API Key'
  },
  generating: {
    zh: '生成中…',
    en: 'Generating…'
  },
  generate: {
    zh: '生成',
    en: 'Generate'
  },
  resultAlt: {
    zh: '生成结果',
    en: 'Generated result'
  },
  nodeMissing: {
    zh: '节点不存在',
    en: 'Node not found'
  },
  needApiKey: {
    zh: '请先点右上角齿轮配置图像 API Key',
    en: 'Click the gear at the top-right to configure the image API Key'
  },
  needPrompt: {
    zh: '请连接上游提示词',
    en: 'Connect an upstream prompt'
  },
  ready: {
    zh: '点击「生成」开始文生图',
    en: 'Click "Generate" to start text-to-image'
  },
  sizeFromUpstream: {
    zh: '尺寸来自上游连线（当前 {size}）',
    en: 'Size comes from upstream connection (current {size})'
  },
  currentModel: {
    zh: '当前模型：{model}',
    en: 'Current model: {model}'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 안내',
    es: 'Ayuda',
    ar: 'مساعدة',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '图片生成节点使用说明',
    en: 'Image Generation node help',
    ja: '画像生成ノードの使い方',
    ko: '이미지 생성 노드 사용 안내',
    es: 'Ayuda del nodo de generación de imágenes',
    ar: 'مساعدة عقدة توليد الصور',
    fr: 'Aide du nœud de génération d’images',
    pt: 'Ajuda do nó de geração de imagens',
    ru: 'Справка по узлу генерации изображений'
  }
} satisfies Record<string, LocalizedText>