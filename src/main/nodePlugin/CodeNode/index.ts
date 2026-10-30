import type { NodePluginManifest } from '../manifest'
import { CodeNode } from './node'
import render from './render.vue'

import CodeIcon from '@renderer/assets/node-icons/CodeNode.svg'

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
    ru: 'Код',
    hi: 'कोड',
    id: 'Kode',
    de: 'Code',
    vi: 'Mã',
    tr: 'Kod',
    it: 'Codice'
  },
  render,
  iconImage: CodeIcon,
  category: 'tool',
  help: () => import('./CodeHelpDialog.vue'),
  detailPanel: () => import('./CodeDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest