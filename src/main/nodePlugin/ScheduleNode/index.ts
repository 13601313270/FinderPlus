import type { NodePluginManifest } from '../manifest'
import { ScheduleNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ScheduleNode.TYPE,
  nodeClass: ScheduleNode,
  title: {
    zh: '定时触发',
    en: 'Schedule',
    ja: 'スケジュール',
    ko: '스케줄',
    es: 'Programar',
    ar: 'جدولة',
    fr: 'Planification',
    pt: 'Agendar',
    ru: 'Расписание',
    hi: 'अनुसूची',
    id: 'Jadwal',
    de: 'Zeitplan',
    vi: 'Lịch',
    tr: 'Zamanlama',
    it: 'Pianifica'
  },
  render,
  /** 闹钟图标：铃 + 敲击手柄 */
  iconPaths: [
    'M12 6a4 4 0 0 0-4 4v3l-2 2h12l-2-2v-3a4 4 0 0 0-4-4z',
    'M10 18h4',
    'M9 3l1 1',
    'M15 3l-1 1'
  ],
  category: 'flow'
}

export default manifest
