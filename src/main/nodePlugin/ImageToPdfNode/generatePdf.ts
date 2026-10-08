import { bytesToBase64 } from '../../engine/data/base64'
import type { ImageToPdfNode } from './node'

/**
 * 图片转 PDF 的核心逻辑——render.vue 和 ImageToPdfDetailPanel.vue 共用。
 *
 * 为什么放这里而不是 node.ts：
 * node.ts 属于引擎侧（src/main/engine/），但 pdf-lib + Canvas 解码是纯浏览器 API，
 * 必须跑在 renderer 进程，所以生成逻辑不能塞进 node.ts。
 *
 * 调用者传入节点实例，函数内部自己读节点的 pageWidth/pageHeight/margin 和已连接图片，
 * 生成完成后调 node.setOutput() 提交结果。
 */
export async function generatePdfFromNode(node: ImageToPdfNode): Promise<void> {
  const images = node.getConnectedImages()
  if (images.length === 0) return

  const { PDFDocument } = await import('pdf-lib')
  const pdfDoc = await PDFDocument.create()

  const W = node.pdfPageWidth
  const H = node.pdfPageHeight
  const M = node.pdfMargin

  for (const { file } of images) {
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    const mime = file.type
    let embeddedImg
    if (mime === 'image/jpeg' || mime === 'image/jpg') {
      embeddedImg = await pdfDoc.embedJpg(bytes)
    } else if (mime === 'image/png') {
      embeddedImg = await pdfDoc.embedPng(bytes)
    } else {
      const pngBytes = await convertToPngBytes(file)
      embeddedImg = await pdfDoc.embedPng(pngBytes)
    }

    const page = pdfDoc.addPage([W, H])
    const usableW = W - M * 2
    const usableH = H - M * 2
    const imgAspect = embeddedImg.width / embeddedImg.height
    const pageAspect = usableW / usableH

    let drawW: number
    let drawH: number
    if (imgAspect > pageAspect) {
      drawW = usableW
      drawH = usableW / imgAspect
    } else {
      drawH = usableH
      drawW = usableH * imgAspect
    }

    const cx = M + (usableW - drawW) / 2
    const cy = M + (usableH - drawH) / 2

    page.drawImage(embeddedImg, {
      x: cx,
      y: cy,
      width: drawW,
      height: drawH
    })
  }

  const pdfBytes = await pdfDoc.save()
  const base64 = bytesToBase64(pdfBytes)
  const fileName = `output_${Date.now()}.pdf`
  node.setOutput(base64, fileName)
}

/**
 * 把非 PNG/JPG 图片文件转成 PNG 的 Uint8Array。
 * 用 Canvas 解码 → toBlob('image/png') → 读 ArrayBuffer。
 */
function convertToPngBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context 不可用')); return }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(async (blob) => {
        if (!blob) { reject(new Error('toBlob 返回 null')); return }
        const buf = await blob.arrayBuffer()
        resolve(new Uint8Array(buf))
      }, 'image/png')
    }
    img.onerror = () => reject(new Error(`图片解码失败：${file.name}`))
    img.src = URL.createObjectURL(file)
  })
}
