import type { NodePluginManifest } from '../manifest'
import { ImageQualityNode } from './node'
import render from './render.vue'

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
  iconPaths: ['M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z'],
  category: 'image',
  help: () => import('./ImageQualityHelpDialog.vue')
}

export default manifest
