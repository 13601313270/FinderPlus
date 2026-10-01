import type { LocalizedText } from '../../../shared/language'

/**
 * StringConcat 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node'
  },
  templatePlaceholder: {
    zh: '模板，例：https://$1/$2',
    en: 'Template, e.g. https://$1/$2'
  },
  portsCount: {
    zh: '输入端口：{n} 个',
    en: 'Input ports: {n}'
  },
  removePortHint: {
    zh: '移除末尾输入端口',
    en: 'Remove the last input port'
  },
  addPortHint: {
    zh: '新增输入端口',
    en: 'Add an input port'
  },
  resultPlaceholder: {
    zh: '（结果）',
    en: '(Result)'
  }
} satisfies Record<string, LocalizedText>