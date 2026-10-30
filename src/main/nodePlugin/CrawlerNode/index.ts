import type { NodePluginManifest } from '../manifest'
import { CrawlerNode } from './node'
import render from './render.vue'

import CrawlerIcon from '@renderer/assets/node-icons/CrawlerNode.svg'

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
  iconImage: CrawlerIcon,
  category: 'tool',
  help: () => import('./CrawlerHelpDialog.vue'),
  detailPanel: () => import('./CrawlerDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest
