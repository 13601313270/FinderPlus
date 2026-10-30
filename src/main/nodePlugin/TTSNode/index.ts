import type { NodePluginManifest } from '../manifest'
import { TTSNode } from './node'
import render from './render.vue'

import TTSIcon from '@renderer/assets/node-icons/TTSNode.svg'

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
  iconImage: TTSIcon,
  category: 'ai',
  platforms: ["mac"]
}

export default manifest
