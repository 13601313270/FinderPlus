import type { NodePluginManifest } from '../manifest'
import { DelayNode } from './node'
import render from './render.vue'

import DelayIcon from '@renderer/assets/node-icons/DelayNode.svg'

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
  iconImage: DelayIcon,
  category: 'flow',
  platforms: ["mac"]
}

export default manifest
