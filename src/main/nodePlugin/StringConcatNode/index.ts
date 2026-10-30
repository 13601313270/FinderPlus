import type { NodePluginManifest } from '../manifest'
import { StringConcatNode } from './node'
import render from './render.vue'

import StringConcatIcon from '@renderer/assets/node-icons/StringConcatNode.svg'

export const manifest: NodePluginManifest = {
  type: StringConcatNode.TYPE,
  nodeClass: StringConcatNode,
  title: {
    zh: '字符串拼接',
    en: 'String Concat',
    ja: '文字列連結',
    ko: '문자열 연결',
    es: 'Concatenar cadenas',
    ar: 'دمج النصوص',
    fr: 'Concaténation de chaînes',
    pt: 'Concatenar strings',
    ru: 'Конкатенация строк',
    hi: 'स्ट्रिंग संयोजन',
    id: 'Gabung String',
    de: 'Zeichenketten verketten',
    vi: 'Ghép chuỗi',
    tr: 'Dize Birleştirme',
    it: 'Concatenazione stringhe'
  },
  render,
  iconImage: StringConcatIcon,
  category: 'text-data',
  help: () => import('./StringConcatHelpDialog.vue'),
  detailPanel: () => import('./StringConcatDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest
