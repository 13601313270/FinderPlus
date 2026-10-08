import type { NodePluginManifest } from '../manifest'
import { PdfFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: PdfFileNode.TYPE,
  nodeClass: PdfFileNode,
  title: {
    zh: 'PDF 文件',
    en: 'PDF File',
    ja: 'PDFファイル',
    ko: 'PDF 파일',
    es: 'Archivo PDF',
    ar: 'ملف PDF',
    fr: 'Fichier PDF',
    pt: 'Arquivo PDF',
    ru: 'PDF-файл',
    hi: 'PDF फ़ाइल',
    id: 'Berkas PDF',
    de: 'PDF-Datei',
    vi: 'Tệp PDF',
    tr: 'PDF Dosyası',
    it: 'File PDF'
  },
  iconPaths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M9 13h1a2 2 0 1 1 0 4H9v-4Z', 'M14 17v-6h3a1.5 1.5 0 0 1 0 3h-1.5'],
  category: 'file',
  render,
  help: () => import('./PdfFileHelpDialog.vue')
}

export default manifest
