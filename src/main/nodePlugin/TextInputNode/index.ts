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
    ru: 'Ввод текста',
    hi: 'पाठ इनपुट',
    id: 'Masukan Teks',
    de: 'Texteingabe',
    vi: 'Nhập văn bản',
    tr: 'Metin girişi',
    it: 'Input di testo'
  },
  render,
  iconPaths: ['M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2', 'M12 4v16', 'M9 20h6'],
  category: 'input',
  help: () => import('./TextInputHelpDialog.vue')
}

export default manifest