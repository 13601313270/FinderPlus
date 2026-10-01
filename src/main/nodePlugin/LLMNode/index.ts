import type { NodePluginManifest } from '../manifest'
import { LLMNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: LLMNode.TYPE,
  nodeClass: LLMNode,
  title: { zh: '大模型', en: 'LLM' },
  render
}

export default manifest
