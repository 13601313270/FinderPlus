import type { LocalizedText } from '../../../shared/language'

/**
 * Switch 节点卡片内的全部文案。
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: { zh: '拖动节点', en: 'Drag node' },
  branchPass: { zh: '✓ 通过', en: '✓ Pass' },
  branchFail: { zh: '✗ 驳回', en: '✗ Reject' }
} satisfies Record<string, LocalizedText>