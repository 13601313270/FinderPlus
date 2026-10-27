import type { NodePluginManifest } from '../manifest'
import { NotifyNode } from './node'
import render from './render.vue'

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
  iconPaths: [
    'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z',
    'M10 21a2 2 0 0 0 4 0'
  ],
  category: 'flow',
  platforms: ["mac"]
}

export default manifest
