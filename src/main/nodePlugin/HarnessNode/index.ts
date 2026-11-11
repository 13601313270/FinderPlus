import type { NodePluginManifest } from '../manifest'
import { HarnessNode } from './node'
import render from './render.vue'
import LLMIcon from '@renderer/assets/node-icons/LLMNode.svg'

export const manifest: NodePluginManifest = {
  type: HarnessNode.TYPE,
  nodeClass: HarnessNode,
  title: {
    zh: 'Agent Harness',
    en: 'Agent Harness',
    ja: 'エージェントハーネス',
    ko: '에이전트 하네스',
    es: 'Arnes de Agente',
    ar: 'تسخير وكيل',
    fr: 'Harnais d\'Agent',
    pt: 'Arnês de Agente',
    ru: 'Агент Харесс',
    hi: 'एजेंट हर्नेस',
    id: 'Harness Agen',
    de: 'Agenten-Harness',
    vi: 'Ràng buộc Đại lý',
    tr: 'Ajan Koşumu',
    it: 'Imbrago Agente'
  },
  render,
  detailPanel: () => import('./HarnessDetailPanel.vue'),
  iconImage: LLMIcon,
  category: 'ai',
  platforms: ['mac']
}

export default manifest
