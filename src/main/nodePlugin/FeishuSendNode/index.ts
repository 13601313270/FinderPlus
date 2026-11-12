import type { NodePluginManifest } from '../manifest'
import { FeishuSendNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: FeishuSendNode.TYPE,
  nodeClass: FeishuSendNode,
  title: {
    zh: '飞书消息发送',
    en: 'Feishu Send'
  },
  render,
  category: 'flow',
  common: false,
  detailPanel: () => import('./FeishuSendDetailPanel.vue'),
  platforms: ['mac']
}

export default manifest
