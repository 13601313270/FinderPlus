import type { NodePluginManifest } from '../manifest'
import { ImgFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImgFileNode.TYPE,
  nodeClass: ImgFileNode,
  title: { zh: '图片文件', en: 'Image file' },
  render,
  help: () => import('./ImgFileHelpDialog.vue')
}

export default manifest
