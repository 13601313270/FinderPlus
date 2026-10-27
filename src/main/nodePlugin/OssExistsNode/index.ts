import type { NodePluginManifest } from '../manifest'
import { OssExistsNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: OssExistsNode.TYPE,
  nodeClass: OssExistsNode,
  title: {
    zh: 'OSS 文件是否存在',
    en: 'OSS File Exists',
    ja: 'OSS ファイル存在確認',
    ko: 'OSS 파일 존재 여부',
    es: 'Existencia de archivo OSS',
    ar: 'وجود ملف OSS',
    fr: 'Fichier OSS existe',
    pt: 'Arquivo OSS existe',
    ru: 'Файл OSS существует',
    hi: 'OSS फ़ाइल मौजूद है',
    id: 'File OSS Ada',
    de: 'OSS-Datei vorhanden',
    vi: 'Tệp OSS tồn tại',
    tr: 'OSS dosyası var',
    it: 'File OSS esistente'
  },
  render,
  iconPaths: [
    'M12 3 4 7v10l8 4 8-4V7z',
    'M9 12l2 2 4-4'
  ],
  category: 'tool',
  common: false,
  detailPanel: () => import('./OssExistsDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest
