import type { NodePluginManifest } from '../manifest'
import { SwitchNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: SwitchNode.TYPE,
  nodeClass: SwitchNode,
  render
}

export default manifest
