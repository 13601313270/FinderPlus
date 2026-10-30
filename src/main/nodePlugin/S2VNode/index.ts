import type { NodePluginManifest } from '../manifest'
import { S2VNode } from './node'
import render from './render.vue'

import S2VIcon from '@renderer/assets/node-icons/S2VNode.svg'

export const manifest: NodePluginManifest = {
  type: S2VNode.TYPE,
  nodeClass: S2VNode,
  title: {
    zh: '数字人对口型',
    en: 'Digital Human Lip-sync',
    ja: 'デジタルヒューマン リップシンク',
    ko: '디지털 휴먼 립싱크',
    es: 'Humano Digital Lip-sync',
    ar: 'إنسان رقمي مزامنة الشفاه',
    fr: 'Humain Numérique Synchronisation Labiale',
    pt: 'Humano Digital Sincronização Labial',
    ru: 'Цифровой Человек Синхронизация Губ',
    hi: 'डिजिटल ह्यूमन लिप-सिंक',
    id: 'Manusia Digital Sinkronisasi Bibir',
    de: 'Digitaler Mensch Lippensynchronisation',
    vi: 'Người số đồng bộ môi',
    tr: 'Dijital İnsan Dudak Senkronizasyonu',
    it: 'Umano Digitale Sincronizzazione Labiale'
  },
  render,
  detailPanel: () => import('./S2VDetailPanel.vue'),
  // 图标：视频录制 / 播放 两笔
  iconImage: S2VIcon,
  category: 'ai',
  common: false,
  platforms: ["mac"]
}

export default manifest
