import type { NodePluginManifest } from '../manifest'
import { ImageGenNode } from './node'
import render from './render.vue'

import ImageGenIcon from '@renderer/assets/node-icons/ImageGenNode.svg'

export const manifest: NodePluginManifest = {
  type: ImageGenNode.TYPE,
  nodeClass: ImageGenNode,
  title: {
    zh: '图片生成',
    en: 'Image Generation',
    ja: '画像生成',
    ko: '이미지 생성',
    es: 'Generación de imágenes',
    ar: 'توليد الصور',
    fr: 'Génération d’images',
    pt: 'Geração de imagens',
    ru: 'Генерация изображений',
    hi: 'छवि निर्माण',
    id: 'Pembuatan Gambar',
    de: 'Bildgenerierung',
    vi: 'Tạo ảnh',
    tr: 'Görüntü Oluşturma',
    it: 'Generazione immagine'
  },
  render,
  iconImage: ImageGenIcon,
  category: 'ai',
  help: () => import('./ImageGenHelpDialog.vue'),
  detailPanel: () => import('./ImageGenDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest
