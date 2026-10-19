import type { NodePluginManifest } from '../manifest'
import { HtmlFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: HtmlFileNode.TYPE,
  nodeClass: HtmlFileNode,
  title: {
    zh: 'HTML文件',
    en: 'HTML file',
    ja: 'HTMLファイル',
    ko: 'HTML 파일',
    es: 'Archivo HTML',
    ar: 'ملف HTML',
    fr: 'Fichier HTML',
    pt: 'Ficheiro HTML',
    ru: 'HTML-файл',
    hi: 'HTML फ़ाइल',
    id: 'Berkas HTML',
    de: 'HTML-Datei',
    vi: 'Tệp HTML',
    tr: 'HTML dosyası',
    it: 'File HTML'
  },
  iconPaths: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5Z', 'M14 2v5h5', 'M8 13h8', 'M8 17h5'],
  category: 'file',
  render,
  help: () => import('./HtmlFileHelpDialog.vue')
}

export default manifest
