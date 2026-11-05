import type { NodePluginManifest } from '../manifest'
import { ManualTriggerNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ManualTriggerNode.TYPE,
  nodeClass: ManualTriggerNode,
  title: {
    zh: '手动触发',
    en: 'Manual Trigger',
    ja: '手動トリガー',
    ko: '수동 트리거',
    es: 'Disparador Manual',
    ar: 'تشغيل يدوي',
    fr: 'Déclencheur Manuel',
    pt: 'Gatilho Manual',
    ru: 'Ручной Триггер',
    hi: 'मैनुअल ट्रिगर',
    id: 'Pemicu Manual',
    de: 'Manueller Trigger',
    vi: 'Kích hoạt thủ công',
    tr: 'Manuel Tetikleyici',
    it: 'Trigger Manuale'
  },
  render,
  category: 'flow',
  detailPanel: () => import('./ManualTriggerDetailPanel.vue'),
  platforms: ['mac']
}

export default manifest
