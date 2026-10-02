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
  help: () => import('./JsonDisplayHelpDialog.vue')
}

export default manifest
