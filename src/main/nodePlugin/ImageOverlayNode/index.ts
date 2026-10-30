import type { NodePluginManifest } from '../manifest'
import { ImageOverlayNode } from './node'
import render from './render.vue'

import ImageOverlayIcon from '@renderer/assets/node-icons/ImageOverlayNode.svg'

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
  iconImage: ImageOverlayIcon,
  category: 'image',
  help: () => import('./ImageOverlayHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
