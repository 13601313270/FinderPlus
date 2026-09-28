import type { NodePluginManifest } from '../manifest'
import { LLMNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: LLMNode.TYPE,
  nodeClass: LLMNode,
  render
}

export default manifest
