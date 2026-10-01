import type { NodePluginManifest } from '../manifest'
import { ImagePreviewNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImagePreviewNode.TYPE,
  nodeClass: ImagePreviewNode,
  title: { zh: '图片预览', en: 'Image Preview' },
  render
}

export default manifest
