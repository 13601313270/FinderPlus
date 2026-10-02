import type { NodePluginManifest } from '../manifest'
import { TextDisplayNode } from './node'
import render from './render.vue'

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
  iconPaths: ['M4 6h16', 'M4 11h16', 'M4 16h10'],
  category: 'text-data',
  help: () => import('./TextDisplayHelpDialog.vue')
}

export default manifest