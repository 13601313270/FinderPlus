import type { NodePluginManifest } from '../manifest'
import { WireNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: WireNode.TYPE,
  nodeClass: WireNode,
  title: {
    zh: '转接',
    en: 'Reroute',
    ja: 'リルート',
    ko: '리루트',
    es: 'Redireccionar',
    ar: 'إعادة توجيه',
    fr: 'Rerouter',
    pt: 'Redirecionar',
    ru: 'Перенаправить',
    hi: 'रीरूट',
    id: 'Reroute',
    de: 'Umleitung',
    vi: 'Định tuyến lại',
    tr: 'Yönlendir',
    it: 'Riproietta'
  },
  render,
  /** 简单的"接线卡子"图标：两条短横线中间一个点 */
  iconPaths: ['M3 12h6', 'M15 12h6', 'M12 12m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0'],
  category: 'flow'
}

export default manifest
