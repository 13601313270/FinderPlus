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
    ru: 'Конкатенация строк'
  },
  render,
  help: () => import('./StringConcatHelpDialog.vue')
}

export default manifest
