import type { NodePluginManifest } from '../manifest'
import { FolderNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: FolderNode.TYPE,
  nodeClass: FolderNode,
  title: {
    zh: '文件夹',
    en: 'Folder',
    ja: 'フォルダ',
    ko: '폴더',
    es: 'Carpeta',
    ar: 'مجلد',
    fr: 'Dossier',
    pt: 'Pasta',
    ru: 'Папка',
    hi: 'फ़ोल्डर',
    id: 'Folder',
    de: 'Ordner',
    vi: 'Thư mục',
    tr: 'Klasör',
    it: 'Cartella'
  },
  render,
  help: () => import('./FolderHelpDialog.vue')
}

export default manifest