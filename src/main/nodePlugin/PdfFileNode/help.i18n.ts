import type { LocalizedText } from '../../../shared/language'

/**
 * PdfFile 节点帮助文档（PdfFileHelpDialog）的全部文案。
 * 先配中文和英文，其他语言运行时会自动兜底到英语。
 */
export const helpMessages = {
  // —— 这是什么 ——
  whatTitle: {
    zh: '这是什么？',
    en: 'What is this?'
  },
  whatBody: {
    zh: 'PDF 文件节点持有一个 <code>.pdf</code> 文件，并把它作为<b>PDF 文件</b>向下游送出。它中间是文件图标，图标下方显示文件名与大小。',
    en: 'The PDF File node holds a <code>.pdf</code> file and sends it downstream as a <b>PDF file</b>. A file icon sits in the centre, with the file name and size below it.'
  },

  // —— 端口 ——
  portsTitle: {
    zh: '端口',
    en: 'Ports'
  },
  portsLi1: {
    zh: '输出 <code>file</code>：<code>PdfFileValue</code>（kind 为 <code>pdf-file</code>），下游接 PDF 或通用文件类型的节点都能连上。',
    en: 'Output <code>file</code>: a <code>PdfFileValue</code> (kind <code>pdf-file</code>); downstream nodes that accept PDF files or generic files can connect to it.'
  },
  portsLi2: {
    zh: '输出 <code>path</code>：该文件在画布目录下的<b>绝对路径</b>（string）。',
    en: 'Output <code>path</code>: the file’s <b>absolute path</b> inside the canvas directory (string).'
  },
  portsLi3: {
    zh: '输入 <code>file-in</code>：只接受 PDF 文件；收到文件会<b>替换</b>本节点当前文件。',
    en: 'Input <code>file-in</code>: accepts only PDF files; a received file <b>replaces</b> the node’s current file.'
  },

  // —— 使用与交互 ——
  useTitle: {
    zh: '使用与交互',
    en: 'Usage & interaction'
  },
  useLi1: {
    zh: '双击卡片，用<b>系统默认应用</b>打开该文件。',
    en: 'Double-click the card to open the file with the <b>system default app</b>.'
  },
  useLi2: {
    zh: '把图标<b>拖出窗口</b>丢到桌面或文件夹，即可把文件移动到该位置。',
    en: 'Drag the icon <b>out of the window</b> onto the desktop or a folder to move the file there.'
  },
  useLi3: {
    zh: '拖动卡片本身（空白处或文件名）可移动节点在画布上的位置。',
    en: 'Drag the card itself (on empty space or the file name) to move the node around the canvas.'
  }
} satisfies Record<string, LocalizedText>
