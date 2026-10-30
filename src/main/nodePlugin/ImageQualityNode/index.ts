import type { NodePluginManifest } from '../manifest'
import { ImageQualityNode } from './node'
import render from './render.vue'

import ImageQualityIcon from '@renderer/assets/node-icons/ImageQualityNode.svg'

export const manifest: NodePluginManifest = {
  type: ImageQualityNode.TYPE,
  nodeClass: ImageQualityNode,
  title: {
    zh: '图片质量',
    en: 'Image Quality',
    ja: '画像品質',
    ko: '이미지 품질',
    es: 'Calidad de imagen',
    ar: 'جودة الصورة',
    fr: 'Qualité d’image',
    pt: 'Qualidade de imagem',
    ru: 'Качество изображения',
    hi: 'छवि गुणवत्ता',
    id: 'Kualitas Gambar',
    de: 'Bildqualität',
    vi: 'Chất lượng ảnh',
    tr: 'Görüntü kalitesi',
    it: 'Qualità immagine'
  },
  render,
  iconImage: ImageQualityIcon,
  category: 'image',
  help: () => import('./ImageQualityHelpDialog.vue'),
  detailPanel: () => import('./ImageQualityDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest
