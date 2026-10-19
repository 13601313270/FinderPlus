import type { NodePluginManifest } from '../manifest'
import { TTSNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: TTSNode.TYPE,
  nodeClass: TTSNode,
  title: {
    zh: '语音合成',
    en: 'Speech Synthesis',
    ja: '音声合成',
    ko: '음성 합성',
    es: 'Síntesis de voz',
    ar: 'توليف الكلام',
    fr: 'Synthèse vocale',
    pt: 'Síntese de fala',
    ru: 'Синтез речи',
    hi: 'वाक् संश्लेषण',
    id: 'Sintesis Suara',
    de: 'Sprachsynthese',
    vi: 'Tổng hợp giọng nói',
    tr: 'Konuşma Sentezi',
    it: 'Sintesi vocale'
  },
  render,
  detailPanel: () => import('./TTSDetailPanel.vue'),
  // 图标：喇叭 / 声波 两笔
  iconPaths: ['M3 10v4h4l5 4V6L7 10H3Z', 'M16 8a4 4 0 0 1 0 8', 'M19 5a7 7 0 0 1 0 14'],
  category: 'ai'
}

export default manifest
