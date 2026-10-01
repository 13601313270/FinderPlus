import type { NodePluginManifest } from '../manifest'
import { FolderNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: FolderNode.TYPE,
  nodeClass: FolderNode,
  title: { zh: '文件夹', en: 'Folder' },
  render
}

export default manifest