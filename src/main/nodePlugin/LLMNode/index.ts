import type { NodePluginManifest } from '../manifest'
import { LLMNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: LLMNode.TYPE,
  nodeClass: LLMNode,
  title: {
    zh: '大模型',
    en: 'LLM',
    ja: '大規模言語モデル',
    ko: '대규모 언어 모델',
    es: 'Modelo de lenguaje',
    ar: 'نموذج لغوي',
    fr: 'Modèle de langage',
    pt: 'Modelo de linguagem',
    ru: 'Языковая модель',
    hi: 'भाषा मॉडल',
    id: 'Model bahasa',
    de: 'Sprachmodell',
    vi: 'Mô hình ngôn ngữ',
    tr: 'Dil modeli',
    it: 'Modello linguistico'
  },
  render,
  help: () => import('./LLMHelpDialog.vue')
}

export default manifest
