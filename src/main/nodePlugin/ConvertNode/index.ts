import type { NodePluginManifest } from '../manifest'
import { ConvertNode } from './node'
import render from './render.vue'

import ConvertIcon from '@renderer/assets/node-icons/ConvertNode.svg'

export const manifest: NodePluginManifest = {
  type: ConvertNode.TYPE,
  nodeClass: ConvertNode,
  title: {
    zh: '类型转换',
    en: 'Convert',
    ja: '型変換',
    ko: '타입 변환',
    es: 'Convertir',
    ar: 'تحويل النوع',
    fr: 'Convertir',
    pt: 'Converter',
    ru: 'Преобразовать',
    hi: 'प्रकार बदलें',
    id: 'Konversi',
    de: 'Konvertieren',
    vi: 'Chuyển đổi',
    tr: 'Dönüştür',
    it: 'Converti'
  },
  render,
  /** 转换图标：圆（源类型）→ 方（目标类型）弯箭头 */
  iconImage: ConvertIcon,
  category: 'text-data',
  platforms: ["mac"]
}

export default manifest
