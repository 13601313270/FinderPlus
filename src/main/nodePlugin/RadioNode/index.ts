import type { NodePluginManifest } from '../manifest'
import { RadioNode } from './node'
import render from './render.vue'

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
  iconPaths: ['M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0'],
  category: 'input',
  help: () => import('./RadioHelpDialog.vue')
}

export default manifest