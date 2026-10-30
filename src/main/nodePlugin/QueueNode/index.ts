import type { NodePluginManifest } from '../manifest'
import { QueueNode } from './node'
import render from '../BufferNode/render.vue'

import QueueIcon from '@renderer/assets/node-icons/QueueNode.svg'

export const manifest: NodePluginManifest = {
  type: QueueNode.TYPE,
  nodeClass: QueueNode,
  title: {
    zh: '队列（先进先出）',
    en: 'Queue (FIFO)',
    ja: 'キュー（先入れ先出し）',
    ko: '큐 (선입선출)',
    es: 'Cola (FIFO)',
    ar: 'طابور (أول ما يدخل أول ما يخرج)',
    fr: 'File (FIFO)',
    pt: 'Fila (FIFO)',
    ru: 'Очередь (FIFO)',
    hi: 'कतार (FIFO)',
    id: 'Antrean (FIFO)',
    de: 'Warteschlange (FIFO)',
    vi: 'Hàng đợi (FIFO)',
    tr: 'Kuyruk (FIFO)',
    it: 'Coda (FIFO)'
  },
  render,
  iconImage: QueueIcon,
  category: 'flow',
  help: () => import('../BufferNode/BufferHelpDialog.vue'),
  detailPanel: () => import('../BufferNode/BufferDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest