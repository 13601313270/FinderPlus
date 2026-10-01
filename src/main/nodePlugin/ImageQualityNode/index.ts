import type { NodePluginManifest } from '../manifest'
import { ImageQualityNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImageQualityNode.TYPE,
  nodeClass: ImageQualityNode,
  title: { zh: '图片质量', en: 'Image Quality' },
  render
}

export default manifest
