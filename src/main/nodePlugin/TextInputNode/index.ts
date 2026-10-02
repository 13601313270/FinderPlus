import type { NodePluginManifest } from '../manifest'
import { TextInputNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: TextInputNode.TYPE,
  nodeClass: TextInputNode,
  title: {
    zh: '文本输入',
    en: 'Text Input',
    ja: 'テキスト入力',
    ko: '텍스트 입력',
    es: 'Entrada de texto',
    ar: 'إدخال نص',
    fr: 'Saisie de texte',
    pt: 'Entrada de texto',
    ru: 'Ввод текста'
  },
  render,
  help: () => import('./TextInputHelpDialog.vue')
}

export default manifest