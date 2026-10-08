import type { NodePluginManifest } from '../manifest'
import { ImageToPdfNode } from './node'
import render from './render.vue'

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
  iconPaths: ['M4 4h12l4 4v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M16 4v4h4', 'M8 14h8', 'M8 18h5'],
  category: 'image',
  render,
  help: () => import('./ImageToPdfHelpDialog.vue'),
  detailPanel: () => import('./ImageToPdfDetailPanel.vue')
}

export default manifest
