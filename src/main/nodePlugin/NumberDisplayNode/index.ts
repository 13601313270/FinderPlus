import type { NodePluginManifest } from '../manifest'
import { NumberDisplayNode } from './node'
import render from './render.vue'

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
  iconPaths: [
    'M3.5 10 6 7V19',
    'M9.5 9.5a2.5 2.5 0 0 1 5 0c0 2.2-2.2 3.6-3.4 5.2L9 19h6',
    'M17 7A3 3 0 0 1 17 13A3 3 0 0 1 17 19'
  ],
  category: 'text-data',
  help: () => import('./NumberDisplayHelpDialog.vue')
}

export default manifest
