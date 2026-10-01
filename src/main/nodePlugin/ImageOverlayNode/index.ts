import type { NodePluginManifest } from '../manifest'
import { ImageOverlayNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImageOverlayNode.TYPE,
  nodeClass: ImageOverlayNode,
  render,
  help: () => import('./ImageOverlayHelpDialog.vue')
}

export default manifest
