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
  help: () => import('./BackgroundRemoveHelpDialog.vue')
}

export default manifest
