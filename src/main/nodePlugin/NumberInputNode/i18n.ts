import type { LocalizedText } from '../../../shared/language'

/**
 * NumberInput 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node',
    ja: 'ノードをドラッグ',
    ko: '노드 드래그',
    es: 'Arrastrar nodo',
    ar: 'اسحب العقدة',
    fr: 'Glisser le nœud',
    pt: 'Arrastar nó',
    ru: 'Перетащить узел'
  },
  placeholder: {
    zh: '输入数字…',
    en: 'Enter a number…',
    ja: '数値を入力…',
    ko: '숫자 입력…',
    es: 'Introduce un número…',
    ar: 'أدخل رقمًا…',
    fr: 'Saisir un nombre…',
    pt: 'Digite um número…',
    ru: 'Введите число…'
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
