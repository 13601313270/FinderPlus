import type { NodePluginManifest } from '../manifest'
import { OssNode } from './node'
import render from './render.vue'
import aliyunLogo from '@renderer/assets/images/aliyun.png'

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
  iconImage: aliyunLogo,
  category: 'tool',
  detailPanel: () => import('./OssDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest
