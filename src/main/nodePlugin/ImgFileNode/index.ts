import type { NodePluginManifest } from '../manifest'
import { ImgFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImgFileNode.TYPE,
  nodeClass: ImgFileNode,
  title: {
    zh: '图片文件',
    en: 'Image file',
    ja: '画像ファイル',
    ko: '이미지 파일',
    es: 'Archivo de imagen',
    ar: 'ملف صورة',
    fr: 'Fichier image',
    pt: 'Ficheiro de imagem',
    ru: 'Файл изображения',
    hi: 'छवि फ़ाइल',
    id: 'Berkas gambar',
    de: 'Bilddatei',
    vi: 'Tệp ảnh',
    tr: 'Görüntü dosyası',
    it: 'File immagine'
  },
  iconPaths: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5Z', 'M14 2v5h5', 'm4 16 4-4 3 3 2-2 5 5', 'M15 11m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0'],
  category: 'file',
  render,
  help: () => import('./ImgFileHelpDialog.vue')
}

export default manifest
