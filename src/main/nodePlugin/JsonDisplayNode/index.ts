import type { NodePluginManifest } from '../manifest'
import { JsonDisplayNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: JsonDisplayNode.TYPE,
  nodeClass: JsonDisplayNode,
  render
}

export default manifest
