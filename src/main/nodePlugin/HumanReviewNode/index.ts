import type { NodePluginManifest } from '../manifest'
import { HumanReviewNode } from './node'
import render from './render.vue'

import HumanReviewIcon from '@renderer/assets/node-icons/HumanReviewNode.svg'

export const manifest: NodePluginManifest = {
  type: HumanReviewNode.TYPE,
  nodeClass: HumanReviewNode,
  title: {
    zh: '人工审阅',
    en: 'Human Review',
    ja: '人によるレビュー',
    ko: '인간 검토',
    es: 'Revisión humana',
    ar: 'مراجعة بشرية',
    fr: 'Révision humaine',
    pt: 'Revisão humana',
    ru: 'Ручная проверка',
    hi: 'मानव समीक्षा',
    id: 'Tinjauan Manusia',
    de: 'Menschliche Prüfung',
    vi: 'Xem xét thủ công',
    tr: 'İnsan İncelemesi',
    it: 'Revisione umana'
  },
  render,
  detailPanel: () => import('./HumanReviewDetailPanel.vue'),
  iconImage: HumanReviewIcon,
  category: 'flow',
  help: () => import('./HumanReviewHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
