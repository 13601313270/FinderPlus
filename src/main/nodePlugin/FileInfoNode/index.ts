import type { NodePluginManifest } from '../manifest'
import { FileInfoNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: FileInfoNode.TYPE,
  nodeClass: FileInfoNode,
  render
}

export default manifest
