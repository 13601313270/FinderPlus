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
    ru: 'Числовой ввод'
  },
  render,
  help: () => import('./NumberInputHelpDialog.vue')
}

export default manifest
