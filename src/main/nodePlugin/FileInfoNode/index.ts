import type { NodePluginManifest } from '../manifest'
import { FileInfoNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: FileInfoNode.TYPE,
  nodeClass: FileInfoNode,
  title: { zh: '文件信息', en: 'File Info' },
  render
}

export default manifest
