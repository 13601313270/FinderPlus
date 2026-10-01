import type { LocalizedText } from '../../../shared/language'

/**
 * LLM 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点（整个头部可拖）',
    en: 'Drag node (the whole header is draggable)'
  },
  keyConfigured: {
    zh: 'LLM 已配置，点击修改 Key',
    en: 'LLM configured; click to change key'
  },
  keyMissing: {
    zh: '点击配置 LLM API Key',
    en: 'Click to configure LLM API key'
  },
  loading: { zh: '推理中…', en: 'Thinking…' },
  waitingUpstream: {
    zh: '（等待上游输入触发…）',
    en: '(Waiting for upstream input to trigger…)'
  },
  promptHint: {
    zh: '（输入 prompt 后点击发送…）',
    en: '(Enter a prompt and click send…)'
  },
  nodeMissing: { zh: '节点不存在', en: 'Node not found' },
  promptPlaceholder: { zh: '输入 prompt...', en: 'Enter prompt...' },
  autoCall: { zh: '自动调用', en: 'Auto-call' },
  send: { zh: '发送', en: 'Send' }
} satisfies Record<string, LocalizedText>