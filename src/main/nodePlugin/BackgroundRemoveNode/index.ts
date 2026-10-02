import type { NodePluginManifest } from '../manifest'
import { BackgroundRemoveNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: BackgroundRemoveNode.TYPE,
  nodeClass: BackgroundRemoveNode,
  title: {
    zh: '背景移除',
    en: 'Background Remove',
    ja: '背景除去',
    ko: '배경 제거',
    es: 'Quitar fondo',
    ar: 'إزالة الخلفية',
    fr: 'Suppression d’arrière-plan',
    pt: 'Remover fundo',
    ru: 'Удаление фона',
    hi: 'पृष्ठभूमि हटाएँ',
    id: 'Hapus Latar',
    de: 'Hintergrund entfernen',
    vi: 'Xóa nền',
    tr: 'Arka Planı Kaldır',
    it: 'Rimuovi sfondo'
  },
  render,
  iconPaths: ['M6 9m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M6 15m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M20 4 8.12 15.88', 'M14.47 14.48 20 20', 'M8.12 8.12 12 12'],
  help: () => import('./BackgroundRemoveHelpDialog.vue')
}

export default manifest
