import type { NodePluginManifest } from '../manifest'
import { ImagePreviewNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImagePreviewNode.TYPE,
  nodeClass: ImagePreviewNode,
  render
}

export default manifest
