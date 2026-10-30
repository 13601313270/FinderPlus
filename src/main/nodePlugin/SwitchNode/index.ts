import type { NodePluginManifest } from '../manifest'
import { SwitchNode } from './node'
import render from './render.vue'

import SwitchIcon from '@renderer/assets/node-icons/SwitchNode.svg'

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
  iconImage: SwitchIcon,
  category: 'flow',
  help: () => import('./SwitchHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
