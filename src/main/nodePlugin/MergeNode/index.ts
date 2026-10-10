import type { NodePluginManifest } from '../manifest'
import { MergeNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: MergeNode.TYPE,
  nodeClass: MergeNode,
  title: {
    zh: '汇流',
    en: 'Merge',
    ja: '合流',
    ko: '병합',
    es: 'Fusión',
    ar: 'دمج',
    fr: 'Fusion',
    pt: 'Mesclar',
    ru: 'Слияние',
    hi: 'मर्ज',
    id: 'Gabung',
    de: 'Zusammenführen',
    vi: 'Hợp nhất',
    tr: 'Birleştir',
    it: 'Unisci'
  },
  render,
  /** 三条线汇到一条：左侧一个节点接三条入线，右侧一条出线 */
  iconPaths: ['M3 6h4', 'M3 12h8', 'M3 18h4', 'M11 6v12', 'M11 12h10'],
  category: 'flow'
}

export default manifest
