import type { LocalizedText } from '../../../shared/language'

/**
 * HttpRequest 节点卡片内的全部文案。
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: { zh: '拖动节点', en: 'Drag node' },
  collapseConfig: { zh: '收起配置', en: 'Collapse settings' },
  expandConfig: { zh: '展开配置', en: 'Expand settings' },
  collapse: { zh: '收起', en: 'Collapse' },
  expand: { zh: '展开', en: 'Expand' },
  helpHint: { zh: '使用说明', en: 'Help' },
  urlEmptyHint: { zh: '（展开后填写 URL）', en: '(Expand to enter a URL)' },
  headersSummary: { zh: 'headers: {n} 条', en: 'headers: {n}' },
  bodySet: { zh: '已设置', en: 'Set' },
  bodyNone: { zh: '无', en: 'None' },
  bodyNotSent: { zh: '{method} 不带', en: '{method} not sent' },
  portSummary: { zh: '$端口: {n}', en: '$ports: {n}' },
  labelMethod: { zh: '方法', en: 'Method' },
  headersLabel: { zh: 'Headers（KV）', en: 'Headers (KV)' },
  deleteHeaderHint: { zh: '删除这条 header', en: 'Remove this header' },
  addHeader: { zh: '+ 添加 Header', en: '+ Add Header' },
  bodyLabelOptional: { zh: 'Body（可选）', en: 'Body (Optional)' },
  bodyLabelDisabled: { zh: 'Body（{method} 无 body）', en: 'Body ({method} has no body)' },
  bodyPlaceholder: { zh: '请求体', en: 'Request body' },
  bodyPlaceholderDisabled: {
    zh: '{method} 请求不发送 body',
    en: '{method} requests do not send a body'
  },
  timeoutLabel: { zh: '超时(ms)', en: 'Timeout (ms)' },
  portsCount: {
    zh: '输入端口：{n} 个（$1…$N 引用到 URL 模板）',
    en: 'Input ports: {n} (reference as $1…$N in the URL template)'
  },
  requesting: { zh: '请求中…', en: 'Requesting…' },
  networkError: { zh: '网络错误', en: 'Network error' },
  statusCode: { zh: '状态码：{code}', en: 'Status: {code}' },
  noResponseBody: { zh: '（响应无 body）', en: '(Response has no body)' },
  clickToSend: { zh: '（点击「发送」执行请求）', en: '(Click "Send" to execute the request)' },
  sendHint: { zh: '发送请求', en: 'Send request' },
  sendHintNoUrl: { zh: '请先填写 URL', en: 'Please enter a URL first' },
  sending: { zh: '发送中…', en: 'Sending…' },
  send: { zh: '发送', en: 'Send' },
  helpTitle: { zh: 'HTTP 请求节点使用说明', en: 'HTTP Request Node Guide' }
} satisfies Record<string, LocalizedText>