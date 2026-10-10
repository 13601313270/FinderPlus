import type { NodePluginManifest } from '../manifest'
import { CrawlerNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: CrawlerNode.TYPE,
  nodeClass: CrawlerNode,
  title: {
    zh: '爬虫',
    en: 'Crawler',
    ja: 'クローラー',
    ko: '크롤러',
    es: 'Rastreador',
    ar: 'متتبع',
    fr: 'Rastrea',
    pt: 'Rastreador',
    ru: 'Краулер',
    hi: 'क्रॉलर',
    id: 'Perayap',
    de: 'Crawler',
    vi: 'Thu thập',
    tr: 'Tarayıcı',
    it: 'Crawler'
  },
  render,
  iconPaths: [
    'M4 6h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z',
    'M4 6l8 5 8-5',
    'M9 13h6',
    'M9 17h4'
  ],
  category: 'tool',
  help: () => import('./CrawlerHelpDialog.vue'),
  detailPanel: () => import('./CrawlerDetailPanel.vue')
}

export default manifest
