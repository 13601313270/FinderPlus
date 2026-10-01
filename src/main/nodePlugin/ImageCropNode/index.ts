import type { NodePluginManifest } from '../manifest'
import { ImageCropNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImageCropNode.TYPE,
  nodeClass: ImageCropNode,
  title: { zh: '图片裁剪', en: 'Image Crop' },
  render
}

export default manifest
