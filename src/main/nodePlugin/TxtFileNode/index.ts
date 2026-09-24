import type { NodePluginManifest } from '../manifest'
import { TxtFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: TxtFileNode.TYPE,
  nodeClass: TxtFileNode,
  render
}

export default manifest
