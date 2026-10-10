import type { NodePluginManifest } from '../manifest'
import { OssNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: OssNode.TYPE,
  nodeClass: OssNode,
  title: {
    zh: 'OSS 上传',
    en: 'OSS Upload',
    ja: 'OSS アップロード',
    ko: 'OSS 업로드',
    es: 'Subida OSS',
    ar: 'رفع OSS',
    fr: 'Téléversement OSS',
    pt: 'Upload OSS',
    ru: 'Загрузка в OSS',
    hi: 'OSS अपलोड',
    id: 'Unggah OSS',
    de: 'OSS-Upload',
    vi: 'Tải lên OSS',
    tr: 'OSS Yükle',
    it: 'Caricamento OSS'
  },
  render,
  iconPaths: [
    'M12 3 4 7v10l8 4 8-4V7z',
    'M12 12l8-5',
    'M12 12 4 7',
    'M12 12v9'
  ],
  category: 'tool',
  detailPanel: () => import('./OssDetailPanel.vue')
}

export default manifest
