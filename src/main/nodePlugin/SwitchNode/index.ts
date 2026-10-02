import type { NodePluginManifest } from '../manifest'
import { SwitchNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: SwitchNode.TYPE,
  nodeClass: SwitchNode,
  title: { zh: '条件分支', en: 'Switch' },
  render,
  help: () => import('./SwitchHelpDialog.vue')
}

export default manifest
