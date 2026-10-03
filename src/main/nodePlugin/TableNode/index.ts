import type { NodePluginManifest } from '../manifest'
import { TableNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: TableNode.TYPE,
  nodeClass: TableNode,
  title: {
    zh: '数据表',
    en: 'Table',
    ja: 'テーブル',
    ko: '테이블',
    es: 'Tabla',
    ar: 'جدول',
    fr: 'Tableau',
    pt: 'Tabela',
    ru: 'Таблица',
    hi: 'तालिका',
    id: 'Tabel',
    de: 'Tabelle',
    vi: 'Bảng',
    tr: 'Tablo',
    it: 'Tabella'
  },
  render,
  iconPaths: [
    'M3 5h18v14H3z',
    'M3 10h18',
    'M10 5v14'
  ],
  category: 'text-data',
  help: () => import('./TableHelpDialog.vue')
}

export default manifest
