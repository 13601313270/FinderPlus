import type { NodePluginManifest } from '../manifest'
import { PromiseAllNode } from './node'
import render from './render.vue'

import PromiseAllIcon from '@renderer/assets/node-icons/PromiseAllNode.svg'

export const manifest: NodePluginManifest = {
  type: PromiseAllNode.TYPE,
  nodeClass: PromiseAllNode,
  title: {
    zh: '汇合等待就绪',
    en: 'Wait All Ready',
    ja: '全員待ち完了',
    ko: '전부 대기 완료',
    es: 'Esperar Todos Listos',
    ar: 'انتظار جاهزية الجميع',
    fr: 'Attendre Tous Prêts',
    pt: 'Aguardar Todos Prontos',
    ru: 'Ожидание Готовности',
    hi: 'सभी तैयार होने की प्रतीक्षा',
    id: 'Tunggu Semua Siap',
    de: 'Auf Alle Bereit Warten',
    vi: 'Chờ Tất Cả Sẵn Sàng',
    tr: 'Hepsi Hazır Bekle',
    it: 'Attendi Tutti Pronti'
  },
  render,
  // 图标：一个分叉的箭头汇合到一起，再分叉出去（表达"多入多出 + 汇合等待"的语义）
  iconImage: PromiseAllIcon,
  category: 'flow',
  help: () => import('./PromiseAllHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
