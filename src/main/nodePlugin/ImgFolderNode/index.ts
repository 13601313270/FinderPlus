import type { NodePluginManifest } from '../manifest'
import { ImgFolderNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImgFolderNode.TYPE,
  nodeClass: ImgFolderNode,
  render
}

export default manifest