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
    ru: 'Отображение текста'
  },
  render,
  help: () => import('./TextDisplayHelpDialog.vue')
}

export default manifest