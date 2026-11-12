import type { NodePluginManifest } from '../manifest'
import { FeishuReceiveNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: FeishuReceiveNode.TYPE,
  nodeClass: FeishuReceiveNode,
  title: {
    zh: '飞书消息接收',
    en: 'Feishu Receive'
  },
  render,
  category: 'flow',
  common: false,
  detailPanel: () => import('./FeishuDetailPanel.vue'),
  platforms: ['mac']
}

export default manifest
