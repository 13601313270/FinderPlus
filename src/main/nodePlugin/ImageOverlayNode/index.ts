import type { NodePluginManifest } from '../manifest'
import { ImageOverlayNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImageOverlayNode.TYPE,
  nodeClass: ImageOverlayNode,
  title: {
    zh: '图片叠加',
    en: 'Image Overlay',
    ja: '画像オーバーレイ',
    ko: '이미지 오버레이',
    es: 'Superposición de imágenes',
    ar: 'تراكب الصور',
    fr: 'Superposition d’images',
    pt: 'Sobreposição de imagens',
    ru: 'Наложение изображений',
    hi: 'छवि ओवरले',
    id: 'Hamparan gambar',
    de: 'Bildüberlagerung',
    vi: 'Lớp phủ ảnh',
    tr: 'Görüntü katmanı',
    it: 'Sovrapposizione immagini'
  },
  render,
  iconPaths: ['M16 3H5a2 2 0 0 0-2 2v11', 'M8 8h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z'],
  help: () => import('./ImageOverlayHelpDialog.vue')
}

export default manifest
