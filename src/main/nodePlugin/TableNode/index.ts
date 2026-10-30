import type { NodePluginManifest } from '../manifest'
import { TableNode } from './node'
import render from './render.vue'

import TableIcon from '@renderer/assets/node-icons/TableNode.svg'

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
  iconImage: TableIcon,
  category: 'text-data',
  help: () => import('./TableHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
