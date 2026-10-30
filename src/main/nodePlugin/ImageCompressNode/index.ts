import type { NodePluginManifest } from '../manifest'
import { ImageCompressNode } from './node'
import render from './render.vue'

import ImageCompressIcon from '@renderer/assets/node-icons/ImageCompressNode.svg'

export const manifest: NodePluginManifest = {
  type: ImageCompressNode.TYPE,
  nodeClass: ImageCompressNode,
  title: {
    zh: '图片压缩',
    en: 'Image Compress',
    ja: '画像圧縮',
    ko: '이미지 압축',
    es: 'Comprimir imagen',
    ar: 'ضغط الصورة',
    fr: 'Compresser l’image',
    pt: 'Comprimir imagem',
    ru: 'Сжатие изображения',
    hi: 'छवि संपीड़न',
    id: 'Kompres Gambar',
    de: 'Bild komprimieren',
    vi: 'Nén ảnh',
    tr: 'Görüntüyü sıkıştır',
    it: 'Comprimi immagine'
  },
  render,
  iconImage: ImageCompressIcon,
  category: 'image',
  help: () => import('./ImageCompressHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
