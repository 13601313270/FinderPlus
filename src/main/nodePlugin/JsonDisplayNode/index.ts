import type { NodePluginManifest } from '../manifest'
import { JsonDisplayNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: JsonDisplayNode.TYPE,
  nodeClass: JsonDisplayNode,
  title: {
    zh: 'JSON 展示',
    en: 'JSON Display',
    ja: 'JSON 表示',
    ko: 'JSON 표시',
    es: 'Mostrar JSON',
    ar: 'عرض JSON',
    fr: 'Affichage JSON',
    pt: 'Exibir JSON',
    ru: 'Отображение JSON',
    hi: 'JSON प्रदर्शन',
    id: 'Tampilan JSON',
    de: 'JSON-Anzeige',
    vi: 'Hiển thị JSON',
    tr: 'JSON Görüntüleme',
    it: 'Visualizzazione JSON'
  },
  render,
  iconPaths: ['M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1', 'M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1'],
  help: () => import('./JsonDisplayHelpDialog.vue')
}

export default manifest
