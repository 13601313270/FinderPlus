import type { LocalizedText } from '../../../shared/language'

/**
 * 爬虫节点卡片内的全部文案。
 * 按项目约定每条 key 都是 LocalizedText；仅配 zh + en，其余语言兜底到英语。
 */
export const messages = {
  urlEmptyHint: {
    zh: '请输入 URL…',
    en: 'Enter URL…',
  },
  selectorPlaceholder: {
    zh: 'CSS 选择器，如 a.title',
    en: 'CSS selector, e.g. a.title',
  },
  selectorEmptyHint: {
    zh: '请输入选择器…',
    en: 'Enter selector…',
  },
  clickToSend: {
    zh: '点此开始抓取',
    en: 'Click to scrape',
  },
  scrape: {
    zh: '抓取',
    en: 'Scrape',
  },
  scraping: {
    zh: '抓取中…',
    en: 'Scraping…',
  },
  doneStatus: {
    zh: 'HTTP {code} · 命中 {count} 条',
    en: 'HTTP {code} · {count} match(es)',
  },
  networkError: {
    zh: '网络错误',
    en: 'Network error',
  },
  noResult: {
    zh: '无匹配',
    en: 'No match',
  },
  sendHint: {
    zh: '点击执行抓取',
    en: 'Click to run scrape',
  },
  sendHintNoUrl: {
    zh: '请先填写 URL 和选择器',
    en: 'Fill URL and selector first',
  },
  helpTitle: {
    zh: '爬虫节点帮助',
    en: 'Crawler Node Help',
  },
  modeTitle: {
    zh: '模式',
    en: 'Mode',
  },
  extractModeText: {
    zh: '文本内容',
    en: 'Text content',
  },
  extractModeHtml: {
    zh: '内部 HTML',
    en: 'Inner HTML',
  },
  extractModeAttr: {
    zh: '属性值',
    en: 'Attribute value',
  },
  editConfigHint: {
    zh: '在右侧面板中编辑配置',
    en: 'Edit config in the side panel',
  },
} satisfies Record<string, LocalizedText>
