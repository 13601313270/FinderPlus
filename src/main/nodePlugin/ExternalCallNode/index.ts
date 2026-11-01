import type { NodePluginManifest } from '../manifest'
import { ExternalCallNode } from './node'
import render from './render.vue'

import ExternalCallIcon from '@renderer/assets/node-icons/ExternalCallNode.svg'

export const manifest: NodePluginManifest = {
  type: ExternalCallNode.TYPE,
  nodeClass: ExternalCallNode,
  title: {
    zh: '外部调用',
    en: 'External Call',
    ja: '外部呼び出し',
    ko: '외부 호출',
    es: 'Llamada externa',
    ar: 'استدعاء خارجي',
    fr: 'Appel externe',
    pt: 'Chamada externa',
    ru: 'Внешний вызов',
    hi: 'बाहरी कॉल',
    id: 'Panggilan eksternal',
    de: 'Externer Aufruf',
    vi: 'Gọi ngoài',
    tr: 'Dış çağrı',
    it: 'Chiamata esterna'
  },
  render,
  iconImage: ExternalCallIcon,
  category: 'tool',
  detailPanel: () => import('./ExternalCallDetailPanel.vue'),
  platforms: ['mac']
}

export default manifest
