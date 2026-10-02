import type { LocalizedText } from '../../../shared/language'

/**
 * TextDisplay 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node'
  },
  empty: {
    zh: '（暂无输出）',
    en: '(No output)'
  },
  nodeMissing: {
    zh: '节点不存在',
    en: 'Node not found'
  },
  resizeHint: {
    zh: '拖拽调整节点大小',
    en: 'Drag to resize the node'
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
    zh: '文本展示节点使用说明',
    en: 'Text Display node help',
    ja: 'テキスト表示ノードの使い方',
    ko: '텍스트 표시 노드 도움말',
    es: 'Ayuda del nodo Mostrar texto',
    ar: 'مساعدة عقدة عرض النص',
    fr: 'Aide du nœud Affichage texte',
    pt: 'Ajuda do nó Exibir texto',
    ru: 'Справка по узлу «Отображение текста»'
  }
} satisfies Record<string, LocalizedText>