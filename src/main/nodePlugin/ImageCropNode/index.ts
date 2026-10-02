import type { NodePluginManifest } from '../manifest'
import { ImageCropNode } from './node'
import render from './render.vue'

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
  iconPaths: ['M6 2v14a2 2 0 0 0 2 2h14', 'M2 6h14a2 2 0 0 1 2 2v14'],
  help: () => import('./ImageCropHelpDialog.vue')
}

export default manifest
