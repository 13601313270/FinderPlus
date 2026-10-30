import type { NodePluginManifest } from '../manifest'
import { BrowserNode } from './node'
import render from './render.vue'

import BrowserIcon from '@renderer/assets/node-icons/BrowserNode.svg'

export const manifest: NodePluginManifest = {
  type: BrowserNode.TYPE,
  nodeClass: BrowserNode,
  title: {
    zh: '浏览器',
    en: 'Browser',
    ja: 'ブラウザ',
    ko: '브라우저',
    es: 'Navegador',
    ar: 'متصفح',
    fr: 'Navigateur',
    pt: 'Navegador',
    ru: 'Браузер',
    hi: 'ब्राउज़र',
    id: 'Peramban',
    de: 'Browser',
    vi: 'Trình duyệt',
    tr: 'Tarayıcı',
    it: 'Browser'
  },
  render,
  iconImage: BrowserIcon,
  category: 'tool',
  detailPanel: () => import('./BrowserDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest
