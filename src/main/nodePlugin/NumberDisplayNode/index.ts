import type { NodePluginManifest } from '../manifest'
import { NumberDisplayNode } from './node'
import render from './render.vue'

import NumberDisplayIcon from '@renderer/assets/node-icons/NumberDisplayNode.svg'

export const manifest: NodePluginManifest = {
  type: NumberDisplayNode.TYPE,
  nodeClass: NumberDisplayNode,
  title: {
    zh: '数字展示',
    en: 'Number Display',
    ja: '数値表示',
    ko: '숫자 표시',
    es: 'Mostrar número',
    ar: 'عرض الرقم',
    fr: 'Affichage nombre',
    pt: 'Exibir número',
    ru: 'Отображение числа',
    hi: 'संख्या प्रदर्शन',
    id: 'Tampilan angka',
    de: 'Zahlenanzeige',
    vi: 'Hiển thị số',
    tr: 'Sayı Görüntüleme',
    it: 'Visualizzazione numero'
  },
  render,
  // 「123」三个数字：直接点明「数字」，且与数字输入的「#」区分开
  iconImage: NumberDisplayIcon,
  category: 'text-data',
  help: () => import('./NumberDisplayHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
