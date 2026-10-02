import type { LocalizedText } from '../../../shared/language'

/**
 * BoolInput 节点卡片内的全部文案。
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
  clickToOpen: {
    zh: '点击开启',
    en: 'Click to turn on',
    ja: 'クリックでオン',
    ko: '클릭하여 켜기',
    es: 'Clic para activar',
    ar: 'انقر للتشغيل',
    fr: 'Cliquer pour activer',
    pt: 'Clique para ligar',
    ru: 'Нажмите, чтобы включить'
  },
  clickToClose: {
    zh: '点击关闭',
    en: 'Click to turn off',
    ja: 'クリックでオフ',
    ko: '클릭하여 끄기',
    es: 'Clic para desactivar',
    ar: 'انقر للإيقاف',
    fr: 'Cliquer pour désactiver',
    pt: 'Clique para desligar',
    ru: 'Нажмите, чтобы выключить'
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
