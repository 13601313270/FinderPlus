import type { NodePluginManifest } from '../manifest'
import { ImageQualityNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImageQualityNode.TYPE,
  nodeClass: ImageQualityNode,
  title: { zh: '图片质量', en: 'Image Quality' },
  render,
  help: () => import('./ImageQualityHelpDialog.vue')
}

export default manifest
