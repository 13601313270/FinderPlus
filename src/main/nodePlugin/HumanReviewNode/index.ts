import type { NodePluginManifest } from '../manifest'
import { HumanReviewNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: HumanReviewNode.TYPE,
  nodeClass: HumanReviewNode,
  render
}

export default manifest
