import type { NodePluginManifest } from '../manifest'
import { STTNode } from './node'
import render from './render.vue'

import STTIcon from '@renderer/assets/node-icons/STTNode.svg'

export const manifest: NodePluginManifest = {
  type: STTNode.TYPE,
  nodeClass: STTNode,
  title: {
    zh: '语音提取文字',
    en: 'Speech to Text',
    ja: '音声を文字に変換',
    ko: '음성 텍스트 변환',
    es: 'Voz a texto',
    ar: 'تحويل الكلام إلى نص',
    fr: 'Parole en texte',
    pt: 'Fala para texto',
    ru: 'Речь в текст',
    hi: 'वाक् से पाठ',
    id: 'Suara ke Teks',
    de: 'Sprache zu Text',
    vi: 'Chuyển giọng nói thành văn bản',
    tr: 'Sesten Metne',
    it: 'Da voce a testo'
  },
  render,
  detailPanel: () => import('./STTDetailPanel.vue'),
  iconImage: STTIcon,
  category: 'ai',
  platforms: ['mac']
}

export default manifest
