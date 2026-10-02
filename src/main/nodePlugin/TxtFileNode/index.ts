import type { NodePluginManifest } from '../manifest'
import { TxtFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: TxtFileNode.TYPE,
  nodeClass: TxtFileNode,
  title: { zh: '文本文件', en: 'Text file' },
  render,
  help: () => import('./TxtFileHelpDialog.vue')
}

export default manifest
