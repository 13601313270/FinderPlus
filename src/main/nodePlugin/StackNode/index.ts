import type { NodePluginManifest } from '../manifest'
import { StackNode } from './node'
import render from '../BufferNode/render.vue'

import StackIcon from '@renderer/assets/node-icons/StackNode.svg'

export const manifest: NodePluginManifest = {
  type: StackNode.TYPE,
  nodeClass: StackNode,
  title: {
    zh: '栈（后进先出）',
    en: 'Stack (LIFO)',
    ja: 'スタック（後入れ先出し）',
    ko: '스택 (후입선출)',
    es: 'Pila (LIFO)',
    ar: 'مكدس (آخر ما يدخل أول ما يخرج)',
    fr: 'Pile (LIFO)',
    pt: 'Pilha (LIFO)',
    ru: 'Стек (LIFO)',
    hi: 'स्टैक (LIFO)',
    id: 'Tumpukan (LIFO)',
    de: 'Stapel (LIFO)',
    vi: 'Ngăn xếp (LIFO)',
    tr: 'Yığın (LIFO)',
    it: 'Pila (LIFO)'
  },
  render,
  iconImage: StackIcon,
  category: 'flow',
  help: () => import('../BufferNode/BufferHelpDialog.vue'),
  detailPanel: () => import('../BufferNode/BufferDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest