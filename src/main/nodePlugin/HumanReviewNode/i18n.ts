import type { LocalizedText } from '../../../shared/language'

/**
 * HumanReview 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node'
  },
  reviewLabel: {
    zh: '待审核',
    en: 'Pending review'
  },
  awaitingInput: {
    zh: '（等待输入）',
    en: '(Waiting for input)'
  },
  queueRemaining: {
    zh: '队列中还有 {n} 项',
    en: '{n} more in queue'
  },
  queueEmpty: {
    zh: '队列为空',
    en: 'Queue is empty'
  },
  approve: {
    zh: '同意',
    en: 'Approve'
  },
  reject: {
    zh: '拒绝',
    en: 'Reject'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 설명',
    es: 'Ayuda',
    ar: 'مساعدة',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '人工审核节点使用说明',
    en: 'Human Review node help',
    ja: '人によるレビューノードの使い方',
    ko: '인간 검토 노드 사용 설명',
    es: 'Ayuda del nodo Revisión humana',
    ar: 'مساعدة عقدة المراجعة البشرية',
    fr: 'Aide du nœud Révision humaine',
    pt: 'Ajuda do nó Revisão humana',
    ru: 'Справка по узлу «Ручная проверка»'
  }
} satisfies Record<string, LocalizedText>