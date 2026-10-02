import type { NodePluginManifest } from '../manifest'
import { SwitchNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: SwitchNode.TYPE,
  nodeClass: SwitchNode,
  title: {
    zh: '条件分支',
    en: 'Switch',
    ja: '条件分岐',
    ko: '조건 분기',
    es: 'Rama condicional',
    ar: 'تفريع شرطي',
    fr: 'Branche conditionnelle',
    pt: 'Ramo condicional',
    ru: 'Условное ветвление',
    hi: 'शर्त शाखा',
    id: 'Cabang kondisi',
    de: 'Verzweigung',
    vi: 'Nhánh điều kiện',
    tr: 'Koşul dalı',
    it: 'Ramo condizionale'
  },
  render,
  iconPaths: ['M6 15V3', 'M6 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M18 9a9 9 0 0 1-9 9'],
  help: () => import('./SwitchHelpDialog.vue')
}

export default manifest
