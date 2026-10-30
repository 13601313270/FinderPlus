import type { NodePluginManifest } from '../manifest'
import { ScheduleNode } from './node'
import render from './render.vue'

import ScheduleIcon from '@renderer/assets/node-icons/ScheduleNode.svg'

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
  iconImage: ScheduleIcon,
  category: 'flow',
  common: false,
  platforms: ["mac"]
}

export default manifest
