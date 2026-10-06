import type { NodePluginManifest } from '../manifest'
import { DelayNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: DelayNode.TYPE,
  nodeClass: DelayNode,
  title: {
    zh: '延时',
    en: 'Delay',
    ja: '遅延',
    ko: '지연',
    es: 'Retraso',
    ar: 'تأخير',
    fr: 'Délai',
    pt: 'Atraso',
    ru: 'Задержка',
    hi: 'विलंब',
    id: 'Tunda',
    de: 'Verzögerung',
    vi: 'Trễ',
    tr: 'Gecikme',
    it: 'Ritardo'
  },
  render,
  /** 延时图标：一个小时钟 —— 圆弧 + 指针 */
  iconPaths: [
    'M12 7v5l3 2',
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'
  ],
  category: 'flow'
}

export default manifest
