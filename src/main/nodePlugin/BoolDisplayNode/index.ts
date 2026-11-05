import type { NodePluginManifest } from '../manifest'
import { BoolDisplayNode } from './node'
import render from './render.vue'

import BoolDisplayIcon from '@renderer/assets/node-icons/BoolDisplayNode.svg'

export const manifest: NodePluginManifest = {
  type: BoolDisplayNode.TYPE,
  nodeClass: BoolDisplayNode,
  title: {
    zh: '布尔值展示',
    en: 'Bool Display',
    ja: 'ブール表示',
    ko: '불리언 표시',
    es: 'Mostrar booleano',
    ar: 'عرض منطقي',
    fr: 'Affichage booléen',
    pt: 'Exibir booleano',
    ru: 'Отображение логического',
    hi: 'बूलियन प्रदर्शन',
    id: 'Tampilan boolean',
    de: 'Bool-Anzeige',
    vi: 'Hiển thị boolean',
    tr: 'Bool Görüntüleme',
    it: 'Visualizzazione booleano'
  },
  render,
  // 红绿灯：圆点圆圈，里面加一个对勾（暗示 true）
  iconImage: BoolDisplayIcon,
  category: 'text-data',
  help: () => import('./BoolDisplayHelpDialog.vue'),
  platforms: ['mac']
}

export default manifest
