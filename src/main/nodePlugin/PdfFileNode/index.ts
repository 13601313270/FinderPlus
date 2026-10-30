import type { NodePluginManifest } from '../manifest'
import { PdfFileNode } from './node'
import render from './render.vue'

import PdfFileIcon from '@renderer/assets/node-icons/PdfFileNode.svg'

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
  iconImage: PdfFileIcon,
  category: 'file',
  common: false,
  render,
  help: () => import('./PdfFileHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
