import type { LocalizedText } from '../../../shared/language'

/**
 * TextInput 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: { zh: '拖动节点', en: 'Drag node' },
  nodeSettings: { zh: '节点设置', en: 'Node settings' },
  placeholderMultiline: {
    zh: '输入文本…  (Ctrl+Enter 发送)',
    en: 'Type text…  (Ctrl+Enter to send)'
  },
  placeholderSingle: {
    zh: '输入文本…  (Enter 发送)',
    en: 'Type text…  (Enter to send)'
  },
  nodeMissing: { zh: '节点不存在', en: 'Node not found' },
  autoSendOn: {
    zh: '已开启：停止输入后自动发送',
    en: 'On: auto-send after you stop typing'
  },
  autoSendOff: {
    zh: '已关闭：需手动点击发送',
    en: 'Off: send manually'
  },
  autoSendDisabled: {
    zh: '自动发送已开启，无需手动发送',
    en: 'Auto-send is on; no need to send manually'
  },
  sendHint: { zh: '发送到下游节点', en: 'Send to downstream node' },
  autoSend: { zh: '自动发送', en: 'Auto-send' },
  send: { zh: '发送', en: 'Send' },
  multiline: { zh: '多行输入', en: 'Multiline input' },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: '使い方',
    ko: '사용 설명',
    es: 'Ayuda',
    ar: 'تعليمات',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '文本输入节点使用说明',
    en: 'Text Input node help',
    ja: 'テキスト入力ノードの使い方',
    ko: '텍스트 입력 노드 사용 설명',
    es: 'Ayuda del nodo Entrada de texto',
    ar: 'تعليمات عقدة إدخال النص',
    fr: 'Aide du nœud Saisie de texte',
    pt: 'Ajuda do nó Entrada de texto',
    ru: 'Справка по узлу «Ввод текста»'
  }
} satisfies Record<string, LocalizedText>