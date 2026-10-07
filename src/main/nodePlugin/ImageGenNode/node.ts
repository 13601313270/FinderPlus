import { base64ToBytes, bytesToBase64 } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import {
  buildImageRequestBody,
  buildImageRequestHeaders,
  extractImageErrorMessage,
  extractImageResult,
  extractTaskId,
  extractTaskStatus,
  readImageEndpoint,
  readImageProviderKey,
  IMAGE_PROVIDERS,
  type ExtractedImage,
  type ImageProviderId,
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

/**
 * 参考图文件大小上限：百炼对单次请求体有 ~10MB 限制。
 * 7MB 原始文件 → base64 后约 9.3MB，留出 prompt / JSON 结构余量。
 */
const MAX_REFERENCE_IMAGE_BYTES = 7 * 1024 * 1024

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

  /**
   * 参考图 1~4：按端口编号固定顺序，避免 multiple 连线顺序不稳定。
   * 提示词里的"第一张图"对应 ref1，"第二张图"对应 ref2，依此类推。
   * 不接就缺省跳过，模型能吃几张由 providers.ts 的 maxReferenceImages 决定，
   * 超上限（比如 qwen-image-2.0-pro 接了 ref4）会直接报错。
   */
  readonly ref1Input = this.makeReferenceImagePort('ref1', 1)
  readonly ref2Input = this.makeReferenceImagePort('ref2', 2)
  readonly ref3Input = this.makeReferenceImagePort('ref3', 3)
  readonly ref4Input = this.makeReferenceImagePort('ref4', 4)

  private makeReferenceImagePort(id: string, index: number): InputPort {
    const zh = `参考图 ${index}`
    const en = `Ref ${index}`
    return new InputPort(id, {
      accepts: [ImgFileValue],
      label: {
        zh,
        en,
        ja: `参照画像 ${index}`,
        ko: `참조 이미지 ${index}`,
        es: `Referencia ${index}`,
        ar: `المرجع ${index}`,
        fr: `Référence ${index}`,
        pt: `Referência ${index}`,
        ru: `Эталон ${index}`,
        hi: `संदर्भ ${index}`,
        id: `Referensi ${index}`,
        de: `Referenz ${index}`,
        vi: `Hình tham chiếu ${index}`,
        tr: `Referans ${index}`,
        it: `Riferimento ${index}`
      }
    })
  }

  /** 所有参考图端口，按编号顺序排列；resolveReferenceImages 用它遍历 */
  private readonly referenceImagePorts: InputPort[]

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

  /** 方法端口：外部连线触发一次生成（等同点「生成」按钮） */
  readonly generateMethod = new MethodPort('generate', {
    label: {
      zh: '触发生成',
      en: 'Trigger Generate',
      ja: '生成実行',
      ko: '생성 트리거',
      es: 'Activar generación',
      ar: 'تشغيل التوليد',
      fr: 'Déclencher la génération',
      pt: 'Acionar geração',
      ru: 'Запустить генерацию',
      hi: 'जनरेट ट्रिगर',
      id: 'Picu Generasi',
      de: 'Generierung auslösen',
      vi: 'Kích hoạt tạo',
      tr: 'Üretimi tetikle',
      it: 'Attiva generazione'
    }
  })

  // —— 节点级配置 ——
  private provider: ImageProviderId = 'siliconflow'
  private model = ''   // 空串表示用 IMAGE_PROVIDERS[provider].defaultModel

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
    this.addInput(this.ref1Input)
    this.addInput(this.ref2Input)
    this.addInput(this.ref3Input)
    this.addInput(this.ref4Input)
    this.addOutput(this.imageOutput)
    this.addMethod(this.generateMethod)
    // 方法端口被触发 → 等同 UI 点「生成」按钮
    this.generateMethod.onTrigger(() => this.manualTrigger())
    // 所有参考图端口按编号顺序排，resolveReferenceImages 循环它拿到"第一张图→第四张图"的稳定顺序
    this.referenceImagePorts = [this.ref1Input, this.ref2Input, this.ref3Input, this.ref4Input]
    // 内容区硬约束：头部标签 + 预览区 + 底部操作栏（尺寸下拉 + 生成按钮）
    this.setBox(300, 300)
  }

  // —— UI 只读视图 ——

  /** 节点级 getter / setter：provider 选择 */
  get displayProvider(): ImageProviderId { return this.provider }
  setProvider(v: ImageProviderId): void {
    if (this.provider === v) return
    this.provider = v
    // 换 provider 后，旧的 model 在新 provider 下可能不认（下拉里没这个选项），重置为空让 UI 显示预设默认
    this.model = ''
    this.localSize = ''
    this.notifyChanged()
  }

  /** 节点级 getter / setter：模型（空串 = 预设默认） */
  get displayModel(): string { return this.model }
  setModel(v: string): void {
    if (this.model === v) return
    this.model = v
    this.notifyChanged()
  }

  /** 当前 provider 是否已配全局 Key —— UI 读它决定是否显示警告 */
  get hasProviderKey(): boolean {
    return readImageProviderKey(this.provider).length > 0
  }

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
    return readImageEndpoint(this.provider, this.model).sizes
  }

  /** 当前生效尺寸：上游端口值 > 本地选择（须在当前模型支持列表内）> 当前模型默认尺寸 */
  get displaySize(): string {
    const endpoint = readImageEndpoint(this.provider, this.model)
    if (this.sizeInput.incomingEdgeCount > 0) {
      const [first] = this.sizeInput.value
      if (first instanceof StringValue && !first.isNull && first.value!.trim()) {
        return first.value!.trim()
      }
    }
    if (this.localSize && endpoint.sizes.includes(this.localSize)) {
      return this.localSize
    }
    return endpoint.defaultSize
  }

  /** 当前 Provider / 模型文案，UI 提示用 */
  get displayModelLabel(): string {
    const endpoint = readImageEndpoint(this.provider, this.model)
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

  /**
   * 跳过脏标记——文生图节点是手动触发型：
   * - prompt/size/ref 输入变化只刷新 UI 占位，不自动生成
   * - generate MethodPort 触发由 onTrigger 回调独立处理
   * 两种情况都不需要 engine 层的 dirty 语义，统一只走 inputPortReceiveValue 刷新 UI。
   */
  override _onInputPortChanged(ports: InputPort[], source: InputPortChangeSource): void {
    this.inputPortReceiveValue(ports, source)
  }

  /** 输入端口有变化（值到达 / 连线增删）时只刷新 UI，不自动生成——生成按张计费，等用户点按钮 */
  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    this.notifyChanged()
  }

  /** 取上游提示词：promptInput 里第一个 StringValue */
  private resolvePrompt(): string {
    const [first] = this.promptInput.value
    return first instanceof StringValue && !first.isNull ? first.value! : ''
  }

  /**
   * 按 ref1→ref2→ref3→ref4 的固定顺序收集参考图并转 base64。
   * 某号端口没接就是缺省跳过，后面的端口不顶上（保持编号语义：第一张图就是 ref1）。
   * 百炼 multmodal-generation 接口要求 base64 必须带 data URI 前缀：
   *   data:{mime_type};base64,{base64_data}
   * http/https URL 不需要前缀，resolveReferenceImages 这里只处理 File 对象，
   * 所以统一拼前缀；URL 形式的参考图（如果以后支持）在 buildImageRequestBody 里判断。
   */
  private async resolveReferenceImages(): Promise<{
    images?: string[]
    tooLarge?: number
  }> {
    const imgs: string[] = []
    for (const port of this.referenceImagePorts) {
      const [first] = port.value
      if (!(first instanceof ImgFileValue) || first.isNull) continue
      if (first.file!.size > MAX_REFERENCE_IMAGE_BYTES) {
        return { tooLarge: imgs.length }
      }
      const bytes = new Uint8Array(await first.file!.arrayBuffer())
      const mime = first.file!.type || 'image/png'
      imgs.push(`data:${mime};base64,${bytesToBase64(bytes)}`)
    }
    return { images: imgs }
  }

  /** 生成前的取值 + 校验；通过后发起请求 */
  private async doFetch(): Promise<void> {
    const endpoint = readImageEndpoint(this.provider, this.model)

    if (!endpoint.key) {
      this.status = 'error'
      const label = IMAGE_PROVIDERS[this.provider].label
      this.errorMessage = `请在全局设置中为 ${label} 配置 API Key`
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

    const refResolved = await this.resolveReferenceImages()
    // 第 N 张参考图文件过大：提示用户压缩，不发请求
    if (refResolved.tooLarge !== undefined) {
      const n = refResolved.tooLarge + 1
      this.status = 'error'
      this.errorMessage = `第 ${n} 张参考图太大（超过 7MB），请压缩后再试`
      this.resultFile = null
      this.notifyChanged()
      return
    }

    // —— 端口编号连续性检查：必须从 ref1 开始、按顺序接，不能跳号 ——
    // 提示词里的"第一张图""第二张图"依赖 ref1→ref2→ref3→ref4 的稳定顺序，
    // 如果只接 ref2、ref3，content 数组里 ref2 会变成"第一张"——编号错位。
    const refIndices: number[] = []
    for (let i = 0; i < this.referenceImagePorts.length; i++) {
      const [first] = this.referenceImagePorts[i].value
      if (first instanceof ImgFileValue) refIndices.push(i + 1) // i+1 = 端口编号 (1~4)
    }
    for (let i = 0; i < refIndices.length; i++) {
      const expected = i + 1
      if (refIndices[i] !== expected) {
        const missing = expected
        const first = refIndices[0]
        this.status = 'error'
        this.errorMessage = `参考图端口需要从 ref1 开始连续接：您接了 ref${first}、ref${refIndices.join('/')}，请先接 ref${missing}`
        this.resultFile = null
        this.notifyChanged()
        return
      }
    }

    const refCount = refResolved.images?.length ?? 0
    // 接了参考图但当前模型不支持：提示用户换模型，参考图也不会被静默丢弃
    if (refCount > 0 && endpoint.maxReferenceImages === 0) {
      this.status = 'error'
      this.errorMessage = `当前模型 ${endpoint.model} 不支持参考图，可切换到百炼的 qwen-image-2.0-2in1 / qwen-image-2.0-pro 或 wan2.6-image`
      this.resultFile = null
      this.notifyChanged()
      return
    }
    // 参考图数量超过当前模型上限：明确报错，不静默截断
    if (refCount > endpoint.maxReferenceImages) {
      this.status = 'error'
      this.errorMessage = `参考图过多：当前模型 ${endpoint.model} 最多支持 ${endpoint.maxReferenceImages} 张，您接了 ${refCount} 张`
      this.resultFile = null
      this.notifyChanged()
      return
    }

    const myRequestId = ++this.requestId
    await this.fetchAndCommit(endpoint, prompt, this.displaySize, refResolved.images, myRequestId)
  }

  /** 调生成接口 → 拿到图片字节 → commit 到输出端口；失败写 errorMessage */
  private async fetchAndCommit(
    endpoint: ResolvedImageEndpoint,
    prompt: string,
    size: string,
    referenceImages: readonly string[] | undefined,
    myRequestId: number
  ): Promise<void> {
    this.beginRun()
    this.status = 'loading'
    this.errorMessage = ''
    this.notifyChanged()

    let file: File | null = null
    let hash = ''
    let errMsg = ''

    try {
      const outcome = await this.requestImage(endpoint, prompt, size, referenceImages, myRequestId)
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
      this.completeRun() // 成功产出 → stable
    } else {
      this.status = 'error'
      this.errorMessage = errMsg || '生成失败'
      this.resultFile = null
      this.failRun() // 失败 → running 兜底回到 dirty
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
    referenceImages: readonly string[] | undefined,
    myRequestId: number
  ): Promise<{ result?: ExtractedImage; error?: string; cancelled?: boolean }> {
    const res = await fetch(endpoint.requestUrl, {
      method: 'POST',
      headers: buildImageRequestHeaders(endpoint),
      body: JSON.stringify(buildImageRequestBody(endpoint, prompt, size, referenceImages))
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
    return {
      provider: this.provider,
      model: this.model,
      localSize: this.localSize
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.provider === 'string' && IMAGE_PROVIDERS[state.provider as ImageProviderId]) {
      this.provider = state.provider as ImageProviderId
    }
    if (typeof state.model === 'string') {
      this.model = state.model
    }
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
