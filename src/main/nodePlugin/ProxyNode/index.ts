import type { NodePluginManifest } from '../manifest'
import { ProxyNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ProxyNode.TYPE,
  nodeClass: ProxyNode,
  title: {
    zh: '代理',
    en: 'Proxy',
  },
  render,
  detailPanel: () => import('./ProxyDetailPanel.vue'),
  category: 'flow',
  platforms: ["mac"]
}

export default manifest
