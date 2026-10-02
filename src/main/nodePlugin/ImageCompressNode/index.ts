import type { NodePluginManifest } from '../manifest'
import { ImageCompressNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImageCompressNode.TYPE,
  nodeClass: ImageCompressNode,
  title: { zh: '图片压缩', en: 'Image Compress' },
  render,
  help: () => import('./ImageCompressHelpDialog.vue')
}

export default manifest
