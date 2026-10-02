import type { LocalizedText } from '../../../shared/language'

/**
 * BoolInput 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node'
  },
  clickToOpen: {
    zh: '点击开启',
    en: 'Click to turn on'
  },
  clickToClose: {
    zh: '点击关闭',
    en: 'Click to turn off'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 안내',
    es: 'Ayuda',
    ar: 'مساعدة',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '布尔输入节点使用说明',
    en: 'Boolean Input node help',
    ja: 'ブール入力ノードの使い方',
    ko: '불리언 입력 노드 사용 안내',
    es: 'Ayuda del nodo Entrada booleana',
    ar: 'مساعدة عقدة الإدخال المنطقي',
    fr: 'Aide du nœud Entrée booléenne',
    pt: 'Ajuda do nó Entrada booleana',
    ru: 'Справка по узлу «Логический ввод»'
  }
} satisfies Record<string, LocalizedText>