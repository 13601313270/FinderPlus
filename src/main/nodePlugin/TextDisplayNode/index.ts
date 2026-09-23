import type { NodePluginManifest } from '../manifest'
import { TextDisplayNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: TextDisplayNode.TYPE,
  nodeClass: TextDisplayNode,
  render
}

export default manifest