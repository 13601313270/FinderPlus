import type { LocalizedText } from '../../../shared/language'

/**
 * NumberInput 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node'
  },
  placeholder: {
    zh: '输入数字…',
    en: 'Enter a number…'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: 'ヘルプ',
    ko: '도움말',
    es: 'Ayuda',
    ar: 'مساعدة',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '数字输入节点使用说明',
    en: 'Number Input node help',
    ja: '数値入力ノードの使い方',
    ko: '숫자 입력 노드 사용 방법',
    es: 'Ayuda del nodo Entrada numérica',
    ar: 'مساعدة عقدة إدخال الأرقام',
    fr: 'Aide du nœud Entrée numérique',
    pt: 'Ajuda do nó Entrada numérica',
    ru: 'Справка по узлу «Числовой ввод»'
  }
} satisfies Record<string, LocalizedText>