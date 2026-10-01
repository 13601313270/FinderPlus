import type { NodePluginManifest } from '../manifest'
import { HttpRequestNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: HttpRequestNode.TYPE,
  nodeClass: HttpRequestNode,
  render,
  help: () => import('./HttpRequestHelpDialog.vue')
}

export default manifest
