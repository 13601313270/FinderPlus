import type { NodePluginManifest } from '../manifest'
import { ImgFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImgFileNode.TYPE,
  nodeClass: ImgFileNode,
  render
}

export default manifest
