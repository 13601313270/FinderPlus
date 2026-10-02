import type { NodePluginManifest } from '../manifest'
import { TxtFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: TxtFileNode.TYPE,
  nodeClass: TxtFileNode,
  title: {
    zh: '文本文件',
    en: 'Text file',
    ja: 'テキストファイル',
    ko: '텍스트 파일',
    es: 'Archivo de texto',
    ar: 'ملف نصي',
    fr: 'Fichier texte',
    pt: 'Ficheiro de texto',
    ru: 'Текстовый файл',
    hi: 'टेक्स्ट फ़ाइल',
    id: 'Berkas teks',
    de: 'Textdatei',
    vi: 'Tệp văn bản',
    tr: 'Metin dosyası',
    it: 'File di testo'
  },
  render,
  help: () => import('./TxtFileHelpDialog.vue')
}

export default manifest
