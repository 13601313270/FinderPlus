/**
 * PDF 预览 composable：封装 pdfjs-dist 的文档加载 / 页面渲染 / 翻页 / 清理。
 *
 * 设计目标：
 *   - 数据源统一是 ArrayBuffer（调用方自己从 File / base64 / URL 转好传进来）
 *   - worker 配置模块级只执行一次（幂等，多个组件共享同一个 workerSrc）
 *   - 两层粒度清理：cancelRenderTask（翻页用，保留文档） / destroyAll（卸载/换文件用）
 *   - 返回的 page state 是 ref，方便直接喂给模板
 *
 * cMapUrl 暂不配：cmaps 目录 200+ bcmap 文件，Vite 不会自动打包 node_modules 子目录。
 * 如需中日韩 PDF 完整渲染，后续可加 vite-plugin-static-copy 复制 cmaps 到产物。
 */

// ── Worker 配置（模块级，幂等） ──
import * as pdfjsLib from 'pdfjs-dist'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite 专用语法，?url 产物是字符串
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

import { ref } from 'vue'

export function usePdfPreview() {
  const currentPage = ref(1)
  const totalPages = ref(0)
  const loading = ref(false)
  const error = ref<string>('')

  // ── 内部任务 / 文档引用 ──
  let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null
  let renderTask: pdfjsLib.RenderTask | null = null
  let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null

  // ── 清理函数（两层粒度） ──

  /** 只取消当前渲染任务（翻页时用，保留 pdfDoc） */
  function cancelRenderTask(): void {
    try { renderTask?.cancel() } catch { /* ignore */ }
    renderTask = null
  }

  /** 彻底销毁：卸载组件或换文件时用 */
  function destroyAll(): void {
    cancelRenderTask()
    try { void loadingTask?.destroy() } catch { /* ignore */ }
    void pdfDoc?.cleanup()?.catch(() => {})
    loadingTask = null
    pdfDoc = null
    totalPages.value = 0
    currentPage.value = 1
    error.value = ''
  }

  // ── 文档加载（重操作，只在文件变化时调用） ──

  async function loadDocument(data: ArrayBuffer): Promise<void> {
    destroyAll()
    loading.value = true
    currentPage.value = 1

    try {
      loadingTask = pdfjsLib.getDocument({ data })
      const pdf = await loadingTask.promise

      pdfDoc = pdf
      totalPages.value = pdf.numPages
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'RenderingCancelledException') return
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
      loadingTask = null
    }
  }

  // ── 页面渲染（轻量，翻页时只走这里） ──
  // 调用方需要提供 canvas 和容器宽度（用来算 scale）

  async function renderPage(
    pageNum: number,
    canvas: HTMLCanvasElement,
    containerWidth: number
  ): Promise<void> {
    cancelRenderTask()

    try {
      const page = await pdfDoc!.getPage(pageNum)

      const baseViewport = page.getViewport({ scale: 1 })
      const scale = containerWidth / baseViewport.width
      const viewport = page.getViewport({ scale })

      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)

      renderTask = page.render({ canvas, viewport })
      await renderTask.promise
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'RenderingCancelledException') return
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      renderTask = null
    }
  }

  // ── 翻页（只调 renderPage，不重建文档） ──

  function goPrev(canvas: HTMLCanvasElement, containerWidth: number): void {
    if (currentPage.value > 1) {
      currentPage.value--
      void renderPage(currentPage.value, canvas, containerWidth)
    }
  }

  function goNext(canvas: HTMLCanvasElement, containerWidth: number): void {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
      void renderPage(currentPage.value, canvas, containerWidth)
    }
  }

  // ── 工具：取第 N 页的天然尺寸（scale=1 的 viewport，pdf 单位） ──

  async function getPageNaturalSize(pageNum: number): Promise<{ width: number; height: number } | null> {
    if (!pdfDoc) return null
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    return { width: viewport.width, height: viewport.height }
  }

  return {
    // 状态
    currentPage,
    totalPages,
    loading,
    error,
    // 操作
    loadDocument,
    renderPage,
    getPageNaturalSize,
    goPrev,
    goNext,
    cancelRenderTask,
    destroyAll,
  }
}
