import type { NodePluginManifest } from '../manifest'
import { StringToHtmlNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: StringToHtmlNode.TYPE,
  nodeClass: StringToHtmlNode,
  title: {
    zh: '转 HTML',
    en: 'To HTML',
    ja: 'HTML変換',
    ko: 'HTML로 변환',
    es: 'A HTML',
    ar: 'إلى HTML',
    fr: 'Vers HTML',
    pt: 'Para HTML',
    ru: 'В HTML',
    hi: 'HTML में',
    id: 'Ke HTML',
    de: 'Zu HTML',
    vi: 'Sang HTML',
    tr: "HTML'e",
    it: 'A HTML'
  },
  render,
  /** 箭头图标：字符串 → HTML */
  iconPaths: [
    'M4 12h12',
    'M14 7l5 5-5 5',
    'M20 7v10'
  ],
  category: 'text-data',
  platforms: ["mac"]
}

export default manifest
