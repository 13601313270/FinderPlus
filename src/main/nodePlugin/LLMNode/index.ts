import type { NodePluginManifest } from '../manifest'
import { LLMNode } from './node'
import render from './render.vue'

import LLMIcon from '@renderer/assets/node-icons/LLMNode.svg'

export const manifest: NodePluginManifest = {
  type: LLMNode.TYPE,
  nodeClass: LLMNode,
  title: {
    zh: '大语言模型',
    en: 'Large Language Model',
    ja: '大規模言語モデル',
    ko: '대규모 언어 모델',
    es: 'Modelo de lenguaje grande',
    ar: 'نموذج لغة كبير',
    fr: 'Grand modèle de langage',
    pt: 'Grande modelo de linguagem',
    ru: 'Большая языковая модель',
    hi: 'बड़ा भाषा मॉडल',
    id: 'Model bahasa besar',
    de: 'Großes Sprachmodell',
    vi: 'Mô hình ngôn ngữ lớn',
    tr: 'Büyük dil modeli',
    it: 'Grande modello linguistico'
  },
  render,
  iconImage: LLMIcon,
  category: 'ai',
  help: () => import('./LLMHelpDialog.vue'),
  detailPanel: () => import('./LLMDetailPanel.vue'),
  platforms: ["mac"]
}

export default manifest
