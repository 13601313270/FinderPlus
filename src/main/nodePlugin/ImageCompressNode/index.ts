import type { NodePluginManifest } from '../manifest'
import { ImageCompressNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImageCompressNode.TYPE,
  nodeClass: ImageCompressNode,
  render
}

export default manifest
