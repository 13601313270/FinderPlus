import type { NodePluginManifest } from '../manifest'
import { ImageCropNode } from './node'
import render from './render.vue'

import ImageCropIcon from '@renderer/assets/node-icons/ImageCropNode.svg'

export const manifest: NodePluginManifest = {
  type: ImageCropNode.TYPE,
  nodeClass: ImageCropNode,
  title: {
    zh: '图片裁剪',
    en: 'Image Crop',
    ja: '画像切り抜き',
    ko: '이미지 자르기',
    es: 'Recortar imagen',
    ar: 'قص الصورة',
    fr: 'Recadrage d’image',
    pt: 'Recortar imagem',
    ru: 'Обрезка изображения',
    hi: 'छवि क्रॉप',
    id: 'Pangkas gambar',
    de: 'Bild zuschneiden',
    vi: 'Cắt ảnh',
    tr: 'Görüntü kırpma',
    it: 'Ritaglio immagine'
  },
  render,
  iconImage: ImageCropIcon,
  category: 'image',
  help: () => import('./ImageCropHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
