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
  render,
  help: () => import('./ImgFileHelpDialog.vue')
}

export default manifest
