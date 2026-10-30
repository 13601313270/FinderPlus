import type { NodePluginManifest } from '../manifest'
import { ImageToPdfNode } from './node'
import render from './render.vue'

import ImageToPdfIcon from '@renderer/assets/node-icons/ImageToPdfNode.svg'

export const manifest: NodePluginManifest = {
  type: ImageToPdfNode.TYPE,
  nodeClass: ImageToPdfNode,
  title: {
    zh: '图片转 PDF',
    en: 'Images to PDF',
    ja: '画像→PDF',
    ko: '이미지를 PDF로',
    es: 'Imágenes a PDF',
    ar: 'صور إلى PDF',
    fr: 'Images vers PDF',
    pt: 'Imagens para PDF',
    ru: 'Изображения в PDF',
    hi: 'चित्रों से PDF',
    id: 'Gambar ke PDF',
    de: 'Bilder zu PDF',
    vi: 'Hình ảnh thành PDF',
    tr: 'Görüntülerden PDF',
    it: 'Immagini in PDF'
  },
  iconImage: ImageToPdfIcon,
  category: 'image',
  render,
  help: () => import('./ImageToPdfHelpDialog.vue'),
  detailPanel: () => import('./ImageToPdfDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest
