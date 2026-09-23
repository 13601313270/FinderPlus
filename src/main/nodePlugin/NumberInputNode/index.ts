import type { NodePluginManifest } from '../manifest'
import { NumberInputNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: NumberInputNode.TYPE,
  nodeClass: NumberInputNode,
  render
}

export default manifest
