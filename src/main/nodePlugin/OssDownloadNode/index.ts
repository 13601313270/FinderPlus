import type { NodePluginManifest } from '../manifest'
import { OssDownloadNode } from './node'
import render from './render.vue'
import aliyunLogo from '@renderer/assets/images/aliyun.png'

export const manifest: NodePluginManifest = {
  type: OssDownloadNode.TYPE,
  nodeClass: OssDownloadNode,
  title: {
    zh: 'OSS 下载',
    en: 'OSS Download',
    ja: 'OSS ダウンロード',
    ko: 'OSS 다운로드',
    es: 'Descarga OSS',
    ar: 'تنزيل OSS',
    fr: 'Téléchargement OSS',
    pt: 'Download OSS',
    ru: 'Загрузка из OSS',
    hi: 'OSS डाउनलोड',
    id: 'Unduh OSS',
    de: 'OSS-Download',
    vi: 'Tải xuống OSS',
    tr: 'OSS İndir',
    it: 'Download OSS'
  },
  render,
  iconImage: aliyunLogo,
  category: 'tool',
  common: false,
  detailPanel: () => import('./OssDownloadDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest
