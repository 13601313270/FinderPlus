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
    ru: 'Наложение изображений'
  },
  render,
  help: () => import('./ImageOverlayHelpDialog.vue')
}

export default manifest
