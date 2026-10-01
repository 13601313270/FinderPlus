import type { NodePluginManifest } from '../manifest'
import { TextInputNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: TextInputNode.TYPE,
  nodeClass: TextInputNode,
  title: { zh: '文本输入', en: 'Text Input' },
  render
}

export default manifest