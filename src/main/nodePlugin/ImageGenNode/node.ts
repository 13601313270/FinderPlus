import { base64ToBytes, bytesToBase64 } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import {
  buildImageRequestBody,
  buildImageRequestHeaders,
  extractImageErrorMessage,
  extractImageResult,
  extractTaskId,
  extractTaskStatus,
  readImageEndpoint,
  type ExtractedImage,
  type ResolvedImageEndpoint
} from './providers'

/**
 * 文生图节点：
 * - prompt 从上游 promptInput 端口传入（本节点没有内部输入框，必须接线）
 * - 尺寸从上游 sizeInput 端口传入；未接线时用节点内本地选择，再不行用**当前模型的默认尺寸**
 *   （不同模型支持的尺寸范围不同，所以默认值跟着模型走，读 providers.ts 的 sizes[0]）
 * - 输出一个 ImgFileValue，下游可接图片预览 / 压缩 / 文件夹等节点
 *
 * 手动触发：点击「生成」才发起请求（图像生成按张计费，不做自动重算）。
 *
 * 配置来自独立键 canvasdesk.image.config（与 LLM 的 Key 分开存）。
 *
 * Stale-call 取消策略与 LLMNode 一致：递增 requestId 标记每次请求，
 * 后发请求回来时 ID 不匹配就丢弃，避免旧响应覆盖新结果。
 */

type ImageGenStatus = 'idle' | 'loading' | 'done' | 'error'

/** 百炼异步任务的轮询间隔 / 总超时：出图通常十几秒到一两分钟 */
const IMAGE_TASK_POLL_INTERVAL_MS = 2500
const IMAGE_TASK_TIMEOUT_MS = 120_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class ImageGenNode extends Node {
  static readonly TYPE = 'image-gen'
  readonly type = ImageGenNode.TYPE

  /** 输入端口：提示词（唯一来源，本节点没有内部 fallback） */
  readonly promptInput = new InputPort('prompt', {
    accepts: [StringValue],
    label: {
      zh: '提示词',
      en: 'Prompt',
      ja: 'プロンプト',
      ko: '프롬프트',
      es: 'Prompt',
      ar: 'موجّه',
      fr: 'Prompt',
      pt: 'Prompt',
      ru: 'Промпт',
      hi: 'प्रॉम्प्ट',
      id: 'Prompt',
      de: 'Prompt',
      vi: 'Prompt',
      tr: 'İstem',
      it: 'Prompt'
    }
  })

  /** 输入端口：尺寸（如 1024x1024）。未接线时回落到本地选择 / 当前模型默认值 */
  readonly sizeInput = new InputPort('size', {
    accepts: [StringValue],
    label: {
      zh: '尺寸',
      en: 'Size',
      ja: 'サイズ',
      ko: '크기',
      es: 'Tamaño',
      ar: 'الحجم',
      fr: 'Taille',
      pt: 'Tamanho',
      ru: 'Размер',
      hi: 'आकार',
      id: 'Ukuran',
      de: 'Größe',
      vi: 'Kích thước',
      tr: 'Boyut',
      it: 'Dimensione'
    }
  })

  /** 输出端口：生成的图片 */
  readonly imageOutput = new OutputPort('image', ImgFileValue, {
    zh: '生成图',
    en: 'Generated Image',
    ja: '生成画像',
    ko: '생성된 이미지',
    es: 'Imagen generada',
    ar: 'صورة مُنشأة',
    fr: 'Image générée',
    pt: 'Imagem gerada',
    ru: 'Созданное изображение',
    hi: 'बनाई गई छवि',
    id: 'Gambar yang dibuat',
    de: 'Erzeugtes Bild',
    vi: 'Ảnh đã tạo',
    tr: 'Oluşturulan görüntü',
    it: 'Immagine generata'
  })

  /** 本地选择的尺寸（sizeInput 未接线时用）。空串 = 跟随当前模型默认尺寸 */
  private localSize = ''

  private status: ImageGenStatus = 'idle'
  private errorMessage = ''
  private resultFile: File | null = null

  /** 请求序列号，用于防止 stale 响应覆盖新结果 */
  private requestId = 0

  constructor(id: string) {
    super(id)
    this.addInput(this.promptInput)
    this.addInput(this.sizeInput)
    this.addOutput(this.imageOutput)
    // 内容区硬约束：头部标签 + 预览区 + 底部操作栏（尺寸下拉 + 生成按钮）
    this.setBox(300, 300)
  }

  // —— UI 只读视图 ——

  /** 当前状态 —— UI 读它决定显示 spinner / 缩略图 / 错误样式 */
  get displayStatus(): ImageGenStatus {
    return this.status
  }

  /** 当前错误信息（status 为 error 时展示） */
  get displayError(): string {
    return this.errorMessage
  }

  /** 最近一次生成结果（UI 拿它建 objectURL 做内联缩略图） */
  get displayFile(): File | undefined {
    return this.resultFile ?? undefined
  }

  /** prompt 是否接了上游连线 */
  get displayPromptConnected(): boolean {
    return this.promptInput.incomingEdgeCount > 0
  }

  /** size 是否接了上游连线（接了时节点内下拉置灰） */
  get displaySizeConnected(): boolean {
    return this.sizeInput.incomingEdgeCount > 0
  }

  /** 当前模型支持的尺寸选项（给节点内下拉用） */
  get displaySizeOptions(): readonly string[] {
    return readImageEndpoint().sizes
  }

  /** 当前生效尺寸：上游端口值 > 本地选择（须在当前模型支持列表内）> 当前模型默认尺寸 */
  get displaySize(): string {
    const endpoint = readImageEndpoint()
    if (this.sizeInput.incomingEdgeCount > 0) {
      const [first] = this.sizeInput.value
      if (first instanceof StringValue && first.value.trim()) {
        return first.value.trim()
      }
    }
    if (this.localSize && endpoint.sizes.includes(this.localSize)) {
      return this.localSize
    }
    return endpoint.defaultSize
  }

  /** 当前 Provider / 模型文案，UI 提示用 */
  get displayModelLabel(): string {
    const endpoint = readImageEndpoint()
    return `${endpoint.label} / ${endpoint.model}`
  }

  /** 节点内下拉改尺寸；sizeInput 接了线时该选择不生效（由上游值优先） */
  setSize(size: string): void {
    if (this.localSize === size) return
    this.localSize = size
    this.notifyChanged()
  }

  /** 手动触发生成；UI 的「生成」按钮点击时调用 */
  manualTrigger(): void {
    void this.doFetch()
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 输入端口有变化（值到达 / 连线增删）时只刷新 UI，不自动生成——生成按张计费，等用户点按钮 */
  inputPortReceiveValue(_ports: InputPort[]): void {
    this.notifyChanged()
  }

  /** 取上游提示词：promptInput 里第一个 StringValue */
  private resolvePrompt(): string {
    const [first] = this.promptInput.value
    return first instanceof StringValue ? first.value : ''
  }

  /** 生成前的取值 + 校验；通过后发起请求 */
  private async doFetch(): Promise<void> {
    const endpoint = readImageEndpoint()

    if (!endpoint.key) {
      this.status = 'error'
      this.errorMessage = '请先点击右上角齿轮配置图像 API Key'
      this.resultFile = null
      this.notifyChanged()
      return
    }

    const prompt = this.resolvePrompt().trim()
    // 提示词为空不浪费额度：回到 idle，UI 显示等待上游输入的占位文案
    if (!prompt) {
      this.status = 'idle'
      this.errorMessage = ''
      this.resultFile = null
      this.notifyChanged()
      return
    }

    const myRequestId = ++this.requestId
    await this.fetchAndCommit(endpoint, prompt, this.displaySize, myRequestId)
  }

  /** 调生成接口 → 拿到图片字节 → commit 到输出端口；失败写 errorMessage */
  private async fetchAndCommit(
    endpoint: ResolvedImageEndpoint,
    prompt: string,
    size: string,
    myRequestId: number
  ): Promise<void> {
    this.status = 'loading'
    this.errorMessage = ''
    this.notifyChanged()

    let file: File | null = null
    let hash = ''
    let errMsg = ''

    try {
      const outcome = await this.requestImage(endpoint, prompt, size, myRequestId)
      // 轮询期间节点被销毁 / 用户又点了生成 → 整个结果丢弃，交给新请求收尾
      if (outcome.cancelled) return
      if (outcome.error) {
        errMsg = outcome.error
      } else if (outcome.result?.base64) {
        const built = this.buildFileFromBase64(outcome.result.base64)
        file = built.file
        hash = built.hash
      } else if (outcome.result?.url) {
        const built = await this.buildFileFromUrl(outcome.result.url)
        file = built.file
        hash = built.hash
      }
    } catch (err) {
      errMsg = err instanceof Error ? err.message : '网络请求异常'
    }

    // —— Stale-call 守卫 ——
    // 期间用户又点了生成 → requestId 已变，本次结果直接丢弃，不覆盖 UI、不 commit
    if (this.requestId !== myRequestId) return

    if (file) {
      this.status = 'done'
      this.resultFile = file
      this.imageOutput.commit(new ImgFileValue(file, hash))
    } else {
      this.status = 'error'
      this.errorMessage = errMsg || '生成失败'
      this.resultFile = null
    }
    this.notifyChanged()
  }

  /**
   * 发请求取图片数据。
   * 同步协议一次拿结果；百炼异步协议要先提交任务再轮询，所以返回取消标记交给上层丢弃。
   */
  private async requestImage(
    endpoint: ResolvedImageEndpoint,
    prompt: string,
    size: string,
    myRequestId: number
  ): Promise<{ result?: ExtractedImage; error?: string; cancelled?: boolean }> {
    const res = await fetch(endpoint.requestUrl, {
      method: 'POST',
      headers: buildImageRequestHeaders(endpoint),
      body: JSON.stringify(buildImageRequestBody(endpoint, prompt, size))
    })
    const data = await res.json().catch(() => undefined)

    if (!res.ok) {
      return { error: extractImageErrorMessage(data) ?? `请求失败（${res.status} ${res.statusText}）` }
    }
    if (endpoint.shape !== 'dashscope-async') {
      return { result: extractImageResult(endpoint.shape, data) }
    }

    const taskId = extractTaskId(data)
    if (!taskId) {
      return { error: extractImageErrorMessage(data) ?? '任务已提交但响应里没有 task_id' }
    }
    return this.waitForTask(endpoint, taskId, myRequestId)
  }

  /**
   * 轮询异步任务直到 成功 / 失败 / 超时。
   * 每轮都校验 requestId：用户中途重新生成或节点被销毁就立刻退出，
   * 否则几轮之后旧任务的结果会把新请求的结果顶掉。
   */
  private async waitForTask(
    endpoint: ResolvedImageEndpoint,
    taskId: string,
    myRequestId: number
  ): Promise<{ result?: ExtractedImage; error?: string; cancelled?: boolean }> {
    const deadline = Date.now() + IMAGE_TASK_TIMEOUT_MS
    while (Date.now() < deadline) {
      await sleep(IMAGE_TASK_POLL_INTERVAL_MS)
      if (this.requestId !== myRequestId) return { cancelled: true }

      const res = await fetch(`${endpoint.taskUrlPrefix}${taskId}`, {
        headers: { Authorization: `Bearer ${endpoint.key}` }
      })
      const data = await res.json().catch(() => undefined)
      if (!res.ok) {
        return { error: extractImageErrorMessage(data) ?? `查询任务失败（${res.status} ${res.statusText}）` }
      }

      const taskStatus = extractTaskStatus(data)
      if (taskStatus === 'SUCCEEDED') {
        return { result: extractImageResult('dashscope-async', data) }
      }
      // UNKNOWN = 任务已过期（百炼的 task_id 只保留 24 小时）
      if (taskStatus === 'FAILED' || taskStatus === 'UNKNOWN') {
        return { error: extractImageErrorMessage(data) ?? `任务失败（${taskStatus}）` }
      }
      // PENDING / RUNNING → 继续等
    }
    const timeoutSec = Math.round(IMAGE_TASK_TIMEOUT_MS / 1000)
    return { error: `生成超时（超过 ${timeoutSec} 秒），任务仍在后台执行，可稍后在百炼控制台查看` }
  }

  /**
   * b64_json 形态：base64 → 字节 → File。
   * OpenAI 图像接口默认返回 PNG（dall-e-2/3 与 gpt-image-1 默认都是），故按 image/png 标记。
   */
  private buildFileFromBase64(b64: string): { file: File; hash: string } {
    const bytes = base64ToBytes(b64)
    // 显式 slice 取纯 ArrayBuffer，避免 TS 5.x 把 Uint8Array<ArrayBufferLike> 卡在 File 构造上
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    return {
      file: new File([ab], this.resultFileName('png'), { type: 'image/png' }),
      hash: djb2(b64)
    }
  }

  /** url 形态：URL 有效期有限，立刻拉成字节再落成 File */
  private async buildFileFromUrl(url: string): Promise<{ file: File; hash: string }> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`下载生成图失败（${res.status} ${res.statusText}）`)
    const blob = await res.blob()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const mime = blob.type || 'image/png'
    const ext = mime.includes('/') ? mime.split('/')[1] : 'png'
    return {
      file: new File([ab], this.resultFileName(ext), { type: mime }),
      hash: djb2(bytesToBase64(bytes))
    }
  }

  /** 生成图文件名：时间戳 + 随机后缀，避免多次生成重名 */
  private resultFileName(ext: string): string {
    return `image-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
  }

  saveState(): Record<string, unknown> {
    return { localSize: this.localSize }
  }

  readState(state: Record<string, unknown>): void {
    // localSize 是普通字符串，只有确实存了才恢复（空串表示跟随模型默认值）
    if (typeof state.localSize === 'string') {
      this.localSize = state.localSize
    }
    // resultFile / status 等派生状态等用户再次生成时刷新
  }

  /** 节点销毁时废弃所有未完成请求：递增 requestId，in-flight 的 fetch 回来时自然丢弃 */
  async beforeDestroy(): Promise<void> {
    this.requestId++
  }
}
