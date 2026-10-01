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
  }
} satisfies Record<string, LocalizedText>