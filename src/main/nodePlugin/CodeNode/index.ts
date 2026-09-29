import type { NodePluginManifest } from '../manifest'
import { CodeNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: CodeNode.TYPE,
  nodeClass: CodeNode,
  render
}

export default manifest