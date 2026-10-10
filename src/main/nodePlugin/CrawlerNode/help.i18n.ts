import type { LocalizedText } from '../../../shared/language'

/**
 * 爬虫节点帮助弹窗文案。
 */
export const messages = {
  intro: {
    zh: '从指定 URL 抓取 HTML，用 CSS 选择器提取元素内容。',
    en: 'Fetch HTML from a URL and extract element content using CSS selectors.',
  },
  urlTitle: {
    zh: 'URL',
    en: 'URL',
  },
  urlDesc: {
    zh: '目标页面地址，支持 $1 $2 … 占位符由上游节点注入。',
    en: 'Target page URL. Supports $1 $2 … placeholders filled by upstream nodes.',
  },
  selectorTitle: {
    zh: 'CSS 选择器',
    en: 'CSS Selector',
  },
  selectorDesc: {
    zh: '选择要提取的元素。常见例子：',
    en: 'Which elements to extract. Common examples:',
  },
  exLink: {
    zh: 'a.title — 所有 class 为 title 的链接',
    en: 'a.title — all links with class "title"',
  },
  exArticle: {
    zh: 'article h2 — 所有 article 内的二级标题',
    en: 'article h2 — all h2 inside article',
  },
  exImg: {
    zh: '.gallery img — 画廊里所有图片',
    en: '.gallery img — all images in gallery',
  },
  modeTitle: {
    zh: '提取模式',
    en: 'Extract Mode',
  },
  modeText: {
    zh: 'text：元素内的纯文本（最常用）',
    en: 'text: plain text inside the element (most common)',
  },
  modeHtml: {
    zh: 'html：元素的内部 HTML 字符串',
    en: 'html: inner HTML string of the element',
  },
  modeAttr: {
    zh: 'attr：指定属性的值（需填写属性名）',
    en: 'attr: value of a specified attribute (fill attribute name)',
  },
  outputTitle: {
    zh: '输出',
    en: 'Output',
  },
  outputResults: {
    zh: 'results（JSON 数组）：每条一个提取结果，可下游继续处理。',
    en: 'results (JSON array): one extracted value per element, pipe downstream.',
  },
  outputRawHtml: {
    zh: 'rawHtml（可选，需勾选）：原始 HTML 全文。',
    en: 'rawHtml (optional, tick to enable): full raw HTML.',
  },
} satisfies Record<string, LocalizedText>
