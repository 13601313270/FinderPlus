import type { NodePluginManifest } from '../manifest'
import { OssExistsNode } from './node'
import render from './render.vue'

import OssExistsIcon from '@renderer/assets/node-icons/OssExistsNode.svg'

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
  iconImage: OssExistsIcon,
  category: 'tool',
  common: false,
  detailPanel: () => import('./OssExistsDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest
