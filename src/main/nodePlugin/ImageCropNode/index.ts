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
    ru: 'Обрезка изображения'
  },
  render,
  help: () => import('./ImageCropHelpDialog.vue')
}

export default manifest
