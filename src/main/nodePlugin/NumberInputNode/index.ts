import type { NodePluginManifest } from '../manifest'
import { NumberInputNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: NumberInputNode.TYPE,
  nodeClass: NumberInputNode,
  title: {
    zh: '数字输入',
    en: 'Number Input',
    ja: '数値入力',
    ko: '숫자 입력',
    es: 'Entrada numérica',
    ar: 'إدخال رقمي',
    fr: 'Entrée numérique',
    pt: 'Entrada numérica',
    ru: 'Числовой ввод',
    hi: 'संख्या इनपुट',
    id: 'Masukan angka',
    de: 'Zahleneingabe',
    vi: 'Đầu vào số',
    tr: 'Sayı Girişi',
    it: 'Input numerico'
  },
  render,
  iconPaths: ['M4 9h16', 'M4 15h16', 'M10 3 8 21', 'M16 3l-2 18'],
  category: 'input',
  help: () => import('./NumberInputHelpDialog.vue')
}

export default manifest
