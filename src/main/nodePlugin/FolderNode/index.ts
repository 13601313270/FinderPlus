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
  iconPaths: ['M3 8a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.6.8l.9 1.2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'],
  help: () => import('./FolderHelpDialog.vue')
}

export default manifest