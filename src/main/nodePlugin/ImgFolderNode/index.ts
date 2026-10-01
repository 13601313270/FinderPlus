import type { NodePluginManifest } from '../manifest'
import { ImgFolderNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImgFolderNode.TYPE,
  nodeClass: ImgFolderNode,
  title: { zh: '图片文件夹', en: 'Image Folder' },
  render
}

export default manifest