import type { NodePluginManifest } from '../manifest'
import { ImgFolderNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImgFolderNode.TYPE,
  nodeClass: ImgFolderNode,
  title: {
    zh: '图片文件夹',
    en: 'Image Folder',
    ja: '画像フォルダ',
    ko: '이미지 폴더',
    es: 'Carpeta de imágenes',
    ar: 'مجلد الصور',
    fr: 'Dossier d’images',
    pt: 'Pasta de imagens',
    ru: 'Папка изображений',
    hi: 'छवि फ़ोल्डर',
    id: 'Folder Gambar',
    de: 'Bildordner',
    vi: 'Thư mục ảnh',
    tr: 'Görüntü Klasörü',
    it: 'Cartella immagini'
  },
  render,
  iconPaths: ['M3 8a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.6.8l.9 1.2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z', 'M9 15.5m-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0', 'm5.5 19.5 4-4 3 3 2.5-2.5 3.5 3.5'],
  category: 'file',
  help: () => import('./ImgFolderHelpDialog.vue')
}

export default manifest