import type { NodePluginManifest } from '../manifest'
import { LLMNode } from './node'
import render from './render.vue'

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
  iconPaths: ['M6 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z', 'M10 10h4v4h-4Z', 'M9 2v2', 'M15 2v2', 'M9 20v2', 'M15 20v2', 'M2 9h2', 'M2 15h2', 'M20 9h2', 'M20 15h2'],
  category: 'ai',
  help: () => import('./LLMHelpDialog.vue')
}

export default manifest
