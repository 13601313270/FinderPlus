import type { NodePluginManifest } from '../manifest'
import { BackgroundRemoveNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: BackgroundRemoveNode.TYPE,
  nodeClass: BackgroundRemoveNode,
  title: { zh: '背景移除', en: 'Background Remove' },
  render,
  help: () => import('./BackgroundRemoveHelpDialog.vue')
}

export default manifest
