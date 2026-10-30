import type { NodePluginManifest } from '../manifest'
import { RadioNode } from './node'
import render from './render.vue'

import RadioIcon from '@renderer/assets/node-icons/RadioNode.svg'

export const manifest: NodePluginManifest = {
  type: RadioNode.TYPE,
  nodeClass: RadioNode,
  title: {
    zh: '单选枚举',
    en: 'Radio',
    ja: 'ラジオ',
    ko: '라디오',
    es: 'Opción única',
    ar: 'اختيار واحد',
    fr: 'Bouton radio',
    pt: 'Opção única',
    ru: 'Переключатель',
    hi: 'रेडियो',
    id: 'Radio',
    de: 'Auswahl',
    vi: 'Nút chọn',
    tr: 'Radyo',
    it: 'Opzione singola'
  },
  render,
  iconImage: RadioIcon,
  category: 'input',
  help: () => import('./RadioHelpDialog.vue'),
  detailPanel: () => import('./RadioDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest