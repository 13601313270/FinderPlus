import type { NodePluginManifest } from '../manifest'
import { BoolInputNode } from './node'
import render from './render.vue'

import BoolInputIcon from '@renderer/assets/node-icons/BoolInputNode.svg'

export const manifest: NodePluginManifest = {
  type: BoolInputNode.TYPE,
  nodeClass: BoolInputNode,
  title: {
    zh: '布尔输入',
    en: 'Boolean Input',
    ja: 'ブール入力',
    ko: '불리언 입력',
    es: 'Entrada booleana',
    ar: 'إدخال منطقي',
    fr: 'Entrée booléenne',
    pt: 'Entrada booleana',
    ru: 'Логический ввод',
    hi: 'बूलियन इनपुट',
    id: 'Masukan boolean',
    de: 'Boolesche Eingabe',
    vi: 'Đầu vào boolean',
    tr: 'Mantıksal Giriş',
    it: 'Input booleano'
  },
  render,
  iconImage: BoolInputIcon,
  category: 'input',
  help: () => import('./BoolInputHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest