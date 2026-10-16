import { base64ToBytes, bytesToBase64 } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { InputPort } from '../../engine/port/InputPort'
import { FileNode } from '../FileNode/node'
import { inferImageMime } from './mime'
import {
  readImageEndpoint,
  readImageProviderKey,
  IMAGE_PROVIDERS,
  type ImageProviderId
} from '../ImageGenNode/providers'
import {
  requestImage,
  buildFileFromBase64,
  buildFileFromUrl
} from '../ImageGenNode/imageGenerationService'

/** 图片后缀集合，供 acceptsExtension 使用 */
const ACCEPTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'])

/** 卡片默认宽度（世界像素）——图片区保持原图比例，高度随宽度推导 */
export const DEFAULT_PREVIEW_WIDTH = 200
/** 卡片最小宽度（用户拖 handle 不能再缩小） */
export const MIN_PREVIEW_WIDTH = 100
/** 卡片最大宽度（用户拖 handle 封顶） */
export const MAX_PREVIEW_WIDTH = 800

/**
 * 图片文件节点：选中图片文件后由渲染端读取二进制（base64），
 * 节点负责构造 ImgFileValue 并从 fileOutput 送出。
 *
 * 与 TxtFileNode 的差异：
 * - 图片二进制内容不持久化（base64 太大，不适合塞进 SQLite）——
 *   持久化只存 fileName + previewWidth，恢复时由 render.vue 的 watch(fileName) 触发兜底读回
 * - 只有单 fileOutput（ImgFileValue，kind = 'img-file'），
 *   没有额外的派生值端口（图片不像文本那样有天然的 string 表示）
 * - previewWidth 是节点专属字段：图片卡片右下角有 resize handle，宽度由用户拖出来，
 *   高度 = 宽度 × 图片原始比例 + 文件名行高度，引擎只存宽度这一个自由度
 */
/**
 * 卡片固定垂直开销 = flex-gap(6) + 文件名行(~14px + padding-bottom 4) + 格式行(~16px) ≈ 40
 * 图片区高度由 boxWidth / 宽高比 得出。
 */
const CARD_VERTICAL_OVERHEAD = 40

export class ImgFileNode extends FileNode {
  static readonly TYPE = 'img-file'

  static override acceptsExtension(ext: string): boolean {
    return ACCEPTED_EXTS.has(ext)
  }

  readonly type = ImgFileNode.TYPE

  /** 文件输出（ImgFileValue，kind = 'img-file'） */
  readonly fileOutput = new OutputPort('file', ImgFileValue, {
    zh: '文件',
    en: 'File',
    ja: 'ファイル',
    ko: '파일',
    es: 'Archivo',
    ar: 'ملف',
    fr: 'Fichier',
    pt: 'Ficheiro',
    ru: 'Файл',
    hi: 'फ़ाइल',
    id: 'Berkas',
    de: 'Datei',
    vi: 'Tệp',
    tr: 'Dosya',
    it: 'File'
  })

  /** 文件数据输入端口：只接受同类型（图片）文件，收到值即替换本节点文件 */
  readonly fileInput = new InputPort('file-in', {
    accepts: [ImgFileValue],
    label: {
      zh: '写入数据',
      en: 'Write Data',
      ja: 'データを書き込む',
      ko: '데이터 쓰기',
      es: 'Escribir datos',
      ar: 'كتابة البيانات',
      fr: 'Écrire des données',
      pt: 'Gravar dados',
      ru: 'Запись данных',
      hi: 'डेटा लिखें',
      id: 'Tulis Data',
      de: 'Daten schreiben',
      vi: 'Ghi dữ liệu',
      tr: 'Veri yaz',
      it: 'Scrivi dati'
    }
  })

  /** 图片天然宽度（像素）。render.vue 的 img load 时回写；0 表示尚未加载 */
  private naturalWidthValue = 0
  /** 图片天然高度（像素）。render.vue 的 img load 时回写；0 表示尚未加载 */
  private naturalHeightValue = 0

  constructor(id: string) {
    super(id)
    this.addOutput(this.fileOutput)
    // 基类共用的路径端口（文件绝对路径），挂在末尾
    this.addOutput(this.pathOutput)
    this.bindFileInput(this.fileInput)
    // 宽度走基类 box（用户可拖 handle 调）；高度维 0 = 不约束，随图片比例撑开
    this.setBox(DEFAULT_PREVIEW_WIDTH, 0)
  }

  /** 文件被输入端口替换后：重读新图片二进制并 commit fileOutput */
  override async reloadFileContent(): Promise<void> {
    if (!this.fileName) return
    try {
      // @ts-ignore — 只在 renderer 里执行，window.fileApi 一定存在
      const base64 = await window.fileApi.readBinary(this.fileName)
      this.setContent(base64)
      // 换了图，旧像素尺寸作废；新尺寸由 render.vue 的 img load 重新回写
      this.naturalWidthValue = 0
      this.naturalHeightValue = 0
    } catch (err) {
      console.warn('[ImgFileNode] 读取替换后的文件失败：', this.fileName, err)
    }
  }

  /**
   * 写入图片二进制内容并 commit fileOutput。
   * 由 render.vue 在读完文件后调用（选文件按钮点击、或持久化恢复时自动读回）。
   *
   * @param base64  文件二进制的 base64 编码（由 fileApi.readBinary 返回）
   */
  setContent(base64: string): void {
    if (!this.fileName) return
    const mime = inferImageMime(this.fileName)
    // base64 → 原始字节 → new File
    const bytes = base64ToBytes(base64)
    // 显式取 slice 后的纯 ArrayBuffer，避免 TS 5.x 把 Uint8Array<ArrayBufferLike> 卡在 File 构造上
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const file = new File([ab], this.fileName, { type: mime })
    const hash = djb2(base64)
    this.fileOutput.commit(new ImgFileValue(file, hash))
    this.notifyChanged()
  }

  /** 当前图片天然宽度（像素）；0 表示尚未加载 */
  get naturalWidth(): number {
    return this.naturalWidthValue
  }

  /** 当前图片天然高度（像素）；0 表示尚未加载 */
  get naturalHeight(): number {
    return this.naturalHeightValue
  }

  /**
   * 写入图片天然宽高，由 render.vue 的 img load 事件触发。
   * 存下天然尺寸后，用当前 box 宽度 + 图片比例算出真实高度写回 box，
   * 让 boxValue 始终有合法的 [width, height]，不再 height=0。
   */
  setNaturalSize(width: number, height: number): void {
    if (width === this.naturalWidthValue && height === this.naturalHeightValue) return
    this.naturalWidthValue = width
    this.naturalHeightValue = height
    // 有了天然比例就把 box height 填上
    this.recalcHeight()
  }

  /**
   * 根据当前 box 宽度和图片天然比例，算出卡片需要的总高度并 setBox。
   * 图片尚未加载（naturalWidth=0）时跳过。
   *
   * 这个方法在两处被调：
   * 1. setNaturalSize（图片首次 load 后）
   * 2. render.vue 的 resize handle 拖拽中（宽度变了，高度跟着按比例变）
   */
  recalcHeight(): void {
    const nw = this.naturalWidthValue
    const nh = this.naturalHeightValue
    if (!nw || !nh) return
    const w = this.box[0] || DEFAULT_PREVIEW_WIDTH
    const aspectRatio = nw / nh
    const iconHeight = w / aspectRatio
    this.setBox(w, Math.round(iconHeight + CARD_VERTICAL_OVERHEAD))
  }

  /**
   * 图片类型（MIME），从文件名后缀推断。render.vue 展示用。
   */
  get imageType(): string {
    return this.fileName ? inferImageMime(this.fileName) : ''
  }

  /**
   * 展示用格式名（JPEG / PNG / GIF / WebP / BMP），从 MIME 转。未知 MIME 兜底返回原 MIME。
   */
  get displayFormat(): string {
    const mime = this.imageType
    if (!mime) return ''
    const map: Record<string, string> = {
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WebP',
      'image/bmp': 'BMP'
    }
    return map[mime] ?? mime
  }

  saveState(): Record<string, unknown> {
    // 持久化键名保持 'previewWidth'（老存档兼容），值来自基类 box 宽
    return {
      ...super.saveState(),
      box: this.box
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)
    const box = state.box as [number, number]
    if (box !== undefined) {
      this.setBox(Math.min(MAX_PREVIEW_WIDTH, Math.max(MIN_PREVIEW_WIDTH, Math.round(box[0]))), box[1])
    }
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }
  
  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  // —— 图生图重绘 ——

  /** 重绘请求的 stale-call 守卫计数器（独立于主流程） */
  private redrawRequestId = 0
  private redrawAbortController: AbortController | null = null

  /**
   * 图生图重绘：用当前图片作为参考图，调用指定的 provider/model 生成新图。
   * ImgFileNode 没有自己的 provider/model 状态，由调用方（弹窗）直接传入。
   *
   * 返回 {file, hash} 或 {error}，不自动落盘/commit，由 applyRedrawResult 处理。
   */
  async generateRedraw(
    prompt: string,
    provider: ImageProviderId,
    model: string
  ): Promise<{ file: File; hash: string } | { error: string }> {
    this.redrawAbortController?.abort()
    this.redrawAbortController = null

    const endpoint = readImageEndpoint(provider, model)

    if (!endpoint.key) {
      const label = IMAGE_PROVIDERS[provider].label
      return { error: `请先在全局设置中为 ${label} 配置 API Key` }
    }

    if (endpoint.maxReferenceImages === 0) {
      return { error: `当前模型 ${endpoint.model} 不支持参考图（图生图），请切换到百炼的 qwen-image-2.0 / wan2.6-image 等模型` }
    }

    if (!this.fileName) {
      return { error: '当前没有可重绘的图片，请先选择文件' }
    }

    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      return { error: '请输入重绘提示词' }
    }

    // 从磁盘读取当前图片 → base64 data URI
    let refImage: string
    try {
      // @ts-ignore — 只在 renderer 里执行
      const b64 = await window.fileApi.readBinary(this.fileName)
      const mime = inferImageMime(this.fileName)
      refImage = `data:${mime};base64,${b64}`
    } catch (err) {
      return { error: `读取当前图片失败：${err instanceof Error ? err.message : String(err)}` }
    }

    const myRequestId = ++this.redrawRequestId
    const controller = new AbortController()
    this.redrawAbortController = controller
    const signal = controller.signal

    try {
      const outcome = await requestImage(
        endpoint, trimmedPrompt, endpoint.defaultSize, [refImage],
        () => this.redrawRequestId !== myRequestId,
        signal
      )
      if (outcome.cancelled) return { error: '已取消' }
      if (outcome.error) return { error: outcome.error }

      let file: File | null = null
      let hash = ''
      if (outcome.result?.base64) {
        const built = buildFileFromBase64(outcome.result.base64)
        file = built.file
        hash = built.hash
      } else if (outcome.result?.url) {
        const built = await buildFileFromUrl(outcome.result.url, signal)
        file = built.file
        hash = built.hash
      }

      if (!file) return { error: '响应里没找到图片数据' }
      if (this.redrawRequestId !== myRequestId) return { error: '已取消' }
      return { file, hash }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { error: '已取消' }
      }
      return { error: err instanceof Error ? err.message : '网络请求异常' }
    } finally {
      if (this.redrawAbortController === controller) this.redrawAbortController = null
    }
  }

  /** 取消正在进行的重绘请求 */
  cancelRedraw(): void {
    this.redrawAbortController?.abort()
    this.redrawAbortController = null
    this.redrawRequestId++
  }

  /**
   * 确认替换：把重绘结果写回磁盘，更新节点状态。
   *
   * 注意：重绘结果几乎总是 PNG（API 默认），但原文件可能是 .jpg/.gif/.webp 等。
   * 为避免扩展名与实际内容不匹配，这里生成新文件名：保持原目录+基名，
   * 替换为与重绘 File 的 MIME 匹配的扩展名。
   */
  applyRedrawResult(file: File, hash: string): void {
    if (!this.fileName) return
    // 推断重绘 File 的正确扩展名
    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp'
    }
    const ext = mimeToExt[file.type] ?? 'png'
    // 原文件路径 → 替换扩展名（保留目录和基名）
    const lastDot = this.fileName.lastIndexOf('.')
    const hasDir = this.fileName.includes('/')
    const dirEnd = hasDir ? this.fileName.lastIndexOf('/') + 1 : 0
    const newName = lastDot >= dirEnd
      ? this.fileName.slice(0, lastDot) + '.' + ext  // 有后缀就替换
      : this.fileName + '.' + ext                     // 无后缀就追加

    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const pureB64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
      let writeResult: { fileName: string; size: number } | null = null
      try {
        // @ts-ignore
        writeResult = await window.fileApi.writeBuffer(newName, pureB64, true)
      } catch {
        // 写盘失败：仍然 commit 内存端口让下游拿到新图，UI 靠 thumbnailUrl 刷新
      }
      // 无论写盘成功与否，都更新端口 + bump revision 让 UI 重建缩略图
      this.fileOutput.commit(new ImgFileValue(file, hash))
      this.fileRevisionValue += 1
      if (writeResult) {
        // 写盘成功：setFile 更新 fileName / fileSize，触发 reloadFileContent → setContent
        this.setFile(writeResult.fileName, writeResult.size)
      } else {
        // 写盘失败：手动 setContent + notifyChanged
        this.setContent(pureB64)
        this.notifyChanged()
      }
    }
    reader.readAsDataURL(file)
  }
}
