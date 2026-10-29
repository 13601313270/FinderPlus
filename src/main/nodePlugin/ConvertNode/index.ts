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
  /** 转换图标：圆（源类型）→ 方（目标类型）弯箭头 */
  iconPaths: [
    // 源类型：圆
    'M8 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8z',
    // 目标类型：方
    'M14 14h7v7h-7z',
    // 弯箭头 + 箭头尖
    'M11 11 Q 12.5 12 14 14 M12 13 L14 14 L13 12'
  ],
  category: 'text-data',
  platforms: ["mac"]
}

export default manifest
