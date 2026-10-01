import type { NodePluginManifest } from '../manifest'
import { HumanReviewNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: HumanReviewNode.TYPE,
  nodeClass: HumanReviewNode,
  title: { zh: '人工审阅', en: 'Human Review' },
  render
}

export default manifest
