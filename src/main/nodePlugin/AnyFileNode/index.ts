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
  iconPaths: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5Z', 'M14 2v5h5', 'M10 13h4', 'M12 11v4'],
  category: 'file',
  render,
  help: () => import('./AnyFileHelpDialog.vue')
}

export default manifest
