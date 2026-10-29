import type { NodePluginManifest } from '../manifest'
import { ConvertNode } from './node'
import render from './render.vue'

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
  /** 转换图标：一个 T 型加箭头 */
  iconPaths: [
    'M4 7h16',
    'M12 7v10',
    'M9 14l3 3 3-3'
  ],
  category: 'text-data',
  platforms: ["mac"]
}

export default manifest
