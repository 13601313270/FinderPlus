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
  iconPaths: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5Z', 'M14 2v5h5', 'M8 13h8', 'M8 17h5'],
  category: 'file',
  render,
  help: () => import('./TxtFileHelpDialog.vue')
}

export default manifest
