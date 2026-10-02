import type { NodePluginManifest } from '../manifest'
import { TextDisplayNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: TextDisplayNode.TYPE,
  nodeClass: TextDisplayNode,
  title: { zh: '文本展示', en: 'Text Display' },
  render,
  help: () => import('./TextDisplayHelpDialog.vue')
}

export default manifest