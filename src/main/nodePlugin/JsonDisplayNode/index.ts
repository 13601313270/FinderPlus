import type { NodePluginManifest } from '../manifest'
import { JsonDisplayNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: JsonDisplayNode.TYPE,
  nodeClass: JsonDisplayNode,
  title: { zh: 'JSON 展示', en: 'JSON Display' },
  render,
  help: () => import('./JsonDisplayHelpDialog.vue')
}

export default manifest
