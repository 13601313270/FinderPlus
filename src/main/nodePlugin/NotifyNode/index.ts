import type { NodePluginManifest } from '../manifest'
import { NotifyNode } from './node'
import render from './render.vue'

import NotifyIcon from '@renderer/assets/node-icons/NotifyNode.svg'

export const manifest: NodePluginManifest = {
  type: NotifyNode.TYPE,
  nodeClass: NotifyNode,
  title: {
    zh: '通知',
    en: 'Notify',
    ja: '通知',
    ko: '알림',
    es: 'Notificar',
    ar: 'إشعار',
    fr: 'Notification',
    pt: 'Notificar',
    ru: 'Уведомление',
    hi: 'सूचना',
    id: 'Notifikasi',
    de: 'Benachrichtigung',
    vi: 'Thông báo',
    tr: 'Bildirim',
    it: 'Notifica'
  },
  render,
  /** 铃铛图标：铃身 + 底部小锤 */
  iconImage: NotifyIcon,
  category: 'flow',
  platforms: ["mac"]
}

export default manifest
