import type { NodePluginManifest } from '../manifest'
import { TextDisplayNode } from './node'
import render from './render.vue'

import TextDisplayIcon from '@renderer/assets/node-icons/TextDisplayNode.svg'

export const manifest: NodePluginManifest = {
  type: TextDisplayNode.TYPE,
  nodeClass: TextDisplayNode,
  title: {
    zh: '文本展示',
    en: 'Text Display',
    ja: 'テキスト表示',
    ko: '텍스트 표시',
    es: 'Mostrar texto',
    ar: 'عرض النص',
    fr: 'Affichage texte',
    pt: 'Exibir texto',
    ru: 'Отображение текста',
    hi: 'टेक्स्ट प्रदर्शन',
    id: 'Tampilan teks',
    de: 'Textanzeige',
    vi: 'Hiển thị văn bản',
    tr: 'Metin Görüntüleme',
    it: 'Visualizzazione testo'
  },
  render,
  iconImage: TextDisplayIcon,
  category: 'text-data',
  help: () => import('./TextDisplayHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest