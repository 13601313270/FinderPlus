import type { NodePluginManifest } from '../manifest'
import { NumberInputNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: NumberInputNode.TYPE,
  nodeClass: NumberInputNode,
  title: { zh: '数字输入', en: 'Number Input' },
  render,
  help: () => import('./NumberInputHelpDialog.vue')
}

export default manifest
