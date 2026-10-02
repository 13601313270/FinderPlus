import type { NodePluginManifest } from '../manifest'
import { StringConcatNode } from './node'
import render from './render.vue'

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
  iconPaths: ['M10 13a5 5 0 0 0 7.1 0l2.4-2.4a5 5 0 0 0-7.1-7.1L11 4.9', 'M14 11a5 5 0 0 0-7.1 0l-2.4 2.4a5 5 0 0 0 7.1 7.1L13 19.1'],
  category: 'text-data',
  help: () => import('./StringConcatHelpDialog.vue')
}

export default manifest
