import type { NodePluginManifest } from '../manifest'
import { StringConcatNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: StringConcatNode.TYPE,
  nodeClass: StringConcatNode,
  render
}

export default manifest
