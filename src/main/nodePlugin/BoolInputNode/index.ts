import type { NodePluginManifest } from '../manifest'
import { BoolInputNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: BoolInputNode.TYPE,
  nodeClass: BoolInputNode,
  title: { zh: '布尔输入', en: 'Boolean Input' },
  render
}

export default manifest