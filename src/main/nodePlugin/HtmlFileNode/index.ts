import type { NodePluginManifest } from '../manifest'
import { HtmlFileNode } from './node'
import render from './render.vue'

import HtmlFileIcon from '@renderer/assets/node-icons/HtmlFileNode.svg'

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
  iconImage: HtmlFileIcon,
  category: 'file',
  render,
  detailPanel: () => import('./HtmlFileDetailPanel.vue'),
  help: () => import('./HtmlFileHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
