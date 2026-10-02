import type { NodePluginManifest } from '../manifest'
import { CodeNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: CodeNode.TYPE,
  nodeClass: CodeNode,
  title: {
    zh: '代码',
    en: 'Code',
    ja: 'コード',
    ko: '코드',
    es: 'Código',
    ar: 'كود',
    fr: 'Code',
    pt: 'Código',
    ru: 'Код'
  },
  render,
  help: () => import('./CodeHelpDialog.vue')
}

export default manifest