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
    ru: 'Папка изображений'
  },
  render,
  help: () => import('./ImgFolderHelpDialog.vue')
}

export default manifest