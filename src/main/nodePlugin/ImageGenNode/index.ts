import type { NodePluginManifest } from '../manifest'
import { ImageGenNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImageGenNode.TYPE,
  nodeClass: ImageGenNode,
  title: { zh: '图片生成', en: 'Image Generation' },
  render,
  help: () => import('./ImageGenHelpDialog.vue')
}

export default manifest
