import type { NodePluginManifest } from '../manifest'
import { AnyFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: AnyFileNode.TYPE,
  nodeClass: AnyFileNode,
  render
}

export default manifest
