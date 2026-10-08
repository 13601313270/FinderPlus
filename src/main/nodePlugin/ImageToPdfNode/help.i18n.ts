import type { LocalizedText } from '../../../shared/language'

export const helpMessages = {
  whatTitle: { zh: '这是什么？', en: 'What is this?' },
  whatBody: {
    zh: '图片转 PDF 节点接收若干张<b>图片</b>（ImgFileValue），把每张图作为 PDF 的一页，输出合并后的 <b>PDF 文件</b>。默认 A4 页面，图片等比缩放居中。',
    en: 'The Images to PDF node accepts multiple <b>images</b> (ImgFileValue), puts each on its own PDF page, and outputs a combined <b>PDF file</b>. Default page size is A4 with centered, proportional scaling.'
  },
  portsTitle: { zh: '端口', en: 'Ports' },
  portsLi1: {
    zh: '输入 <code>image-0/1/...</code>：每张图片一个端口，按端口顺序 = PDF 页面顺序（image-0 → 第 1 页）。所有端口都接上图片时自动新增下一个。',
    en: 'Inputs <code>image-0/1/...</code>: one port per image; port order = page order (image-0 → page 1). A new port is auto-added when all are connected.'
  },
  portsLi2: {
    zh: '输出 <code>pdf</code>：<code>PdfFileValue</code>（kind 为 <code>pdf-file</code>），下游接 PDF 或通用文件类型的节点都能连上。',
    en: 'Output <code>pdf</code>: a <code>PdfFileValue</code> (kind <code>pdf-file</code>); downstream nodes accepting PDF or generic files can connect.'
  },
  portsLi3: {
    zh: '输出 <code>path</code>：基类共用，PDF 文件在画布目录下的<b>绝对路径</b>（string）。',
    en: 'Output <code>path</code>: shared from base class, the PDF file’s <b>absolute path</b> inside the canvas directory (string).'
  },
  useTitle: { zh: '使用与交互', en: 'Usage & interaction' },
  useLi1: {
    zh: '把图片节点的 file 输出连到本节点的 image 输入端口，所有端口接满后自动新增下一个端口。',
    en: 'Connect image nodes’ file outputs to this node’s image inputs; a new port is automatically added once all are connected.'
  },
  useLi2: {
    zh: '点击<b>生成 PDF</b>按钮，把当前所有已连接图片合成为一个 PDF 文件并送出。',
    en: 'Click <b>Generate PDF</b> to combine all connected images into one PDF file and send it downstream.'
  }
} satisfies Record<string, LocalizedText>
