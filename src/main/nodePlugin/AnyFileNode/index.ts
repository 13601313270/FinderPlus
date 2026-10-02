import type { NodePluginManifest } from '../manifest'
import { AnyFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: AnyFileNode.TYPE,
  nodeClass: AnyFileNode,
  title: {
    zh: '任意文件',
    en: 'Any file',
    ja: '任意のファイル',
    ko: '임의 파일',
    es: 'Cualquier archivo',
    ar: 'أي ملف',
    fr: 'N’importe quel fichier',
    pt: 'Qualquer ficheiro',
    ru: 'Любой файл',
    hi: 'कोई भी फ़ाइल',
    id: 'Berkas apa saja',
    de: 'Beliebige Datei',
    vi: 'Tệp bất kỳ',
    tr: 'Herhangi bir dosya',
    it: 'File qualsiasi'
  },
  render,
  help: () => import('./AnyFileHelpDialog.vue')
}

export default manifest
