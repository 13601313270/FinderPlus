import type { NodePluginManifest } from '../manifest'
import { BrowserNode } from './node'
import render from './render.vue'

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
  iconPaths: [
    'M4 5h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z',
    'M4 9h16',
    'M7 6h1',
    'M10 6h1'
  ],
  category: 'tool',
  detailPanel: () => import('./BrowserDetailPanel.vue')
}

export default manifest
