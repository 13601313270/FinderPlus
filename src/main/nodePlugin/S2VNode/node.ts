import { bytesToBase64 } from '../../engine/data/base64'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { VideoFileValue } from '../../engine/data/VideoFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { readImageProviderKey } from '../ImageGenNode/providers'

type S2VStatus = 'idle' | 'uploading' | 'detecting' | 'submitting' | 'polling' | 'done' | 'error'

/** 万相数字人支持的分辨率档位 */
export type S2VResolution = '480P' | '720P'
const RESOLUTIONS: S2VResolution[] = ['480P', '720P']
const DEFAULT_RESOLUTION: S2VResolution = '480P'

/** 数字人驱动场景（wan2.2-s2v-detect 不传 style，style 是 wan2.1 悦动人像 EMO 用的参数） */
/** 轮询间隔（毫秒）：API 建议 15 秒 */
const POLL_INTERVAL_MS = 15_000
/** 音频文件大小上限：15MB */
const MAX_AUDIO_BYTES = 15 * 1024 * 1024
/** 视频生成任务状态 */
type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN' | 'CANCELED'

/**
 * 百炼文件上传凭证响应（getPolicy 返回的 data 字段）。
 * 完整 OSS multipart 上传需要这些字段拼 FormData。
 */
interface UploadPolicy {
  upload_host: string
  upload_dir: string
  oss_access_key_id: string
  signature: string
  policy: string
  x_oss_object_acl: string
  x_oss_forbid_overwrite: string
}

/** 百炼文件上传：GET 凭证 + POST multipart 到 OSS */
async function uploadToDashscope(
  file: File,
  model: string,
  apiKey: string,
  signal: AbortSignal
): Promise<string> {
  // 1. 获取上传凭证
  const policyRes = await fetch(
    `https://dashscope.aliyuncs.com/api/v1/uploads?action=getPolicy&model=${encodeURIComponent(model)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal
    }
  )
  if (!policyRes.ok) {
    const body = await policyRes.text()
    throw new Error(`获取上传凭证失败（${policyRes.status}）：${body.slice(0, 200)}`)
  }
  const policyData = (await policyRes.json()).data as UploadPolicy | undefined
  if (!policyData?.upload_host) {
    throw new Error('上传凭证响应缺少 upload_host')
  }

  // 2. 构造 key（文件名拼到 upload_dir 后面；用时间戳防止重名）
  const safeName = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`
  const key = `${policyData.upload_dir}/${safeName}`

  // 3. 构造 multipart/form-data 上传
  const form = new FormData()
  form.append('OSSAccessKeyId', policyData.oss_access_key_id)
  form.append('Signature', policyData.signature)
  form.append('policy', policyData.policy)
  form.append('x-oss-object-acl', policyData.x_oss_object_acl)
  form.append('x-oss-forbid-overwrite', policyData.x_oss_forbid_overwrite)
  form.append('key', key)
  form.append('success_action_status', '200')
  form.append('file', file, file.name)

  const uploadRes = await fetch(policyData.upload_host, {
    method: 'POST',
    body: form,
    signal
  })
  if (!uploadRes.ok) {
    const body = await uploadRes.text()
    throw new Error(`文件上传失败（${uploadRes.status}）：${body.slice(0, 200)}`)
  }

  return `oss://${key}`
}

/** 百炼异步任务状态查询 */
async function queryTaskStatus(
  workspaceId: string,
  taskId: string,
  apiKey: string,
  signal: AbortSignal
): Promise<{ status: TaskStatus; videoUrl?: string; error?: string }> {
  const url = `https://${workspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/${taskId}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    signal
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`查询任务失败（${res.status}）：${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const output = data?.output ?? {}
  const status = (output.task_status ?? 'UNKNOWN') as TaskStatus
  if (status === 'SUCCEEDED') {
    const results = output.results ?? {}
    return { status, videoUrl: results.video_url }
  }
  if (status === 'FAILED') {
    return { status, error: output.message ?? output.code ?? '任务失败' }
  }
  return { status }
}

/** 从 URL 下载文件并构造 File 对象 */
async function downloadAsFile(url: string, fileName: string, signal: AbortSignal): Promise<File> {
  const httpsUrl = url.replace(/^http:\/\//i, 'https://')
  const res = await fetch(httpsUrl, { signal })
  if (!res.ok) throw new Error(`下载视频失败（${res.status} ${res.statusText}）`)
  const blob = await res.blob()
  // 用实际 content-type，兜底 video/mp4
  const mime = blob.type || 'video/mp4'
  return new File([blob], fileName, { type: mime })
}

/** 文件指纹：djb2（复用 TTSNode/ImageGenNode 的实现） */
function djb2(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

export class S2VNode extends Node {
  static readonly TYPE = 's2v-gen'
  readonly type = S2VNode.TYPE

  // —— 端口 ——

  /** 输入端口：人物图片 */
  readonly imageInput = new InputPort('image', {
    accepts: [ImgFileValue],
    label: {
      zh: '人物图片',
      en: 'Portrait Image',
      ja: '人物画像',
      ko: '인물 이미지',
      es: 'Imagen de retrato',
      ar: 'صورة شخصية',
      fr: 'Image de portrait',
      pt: 'Imagem de retrato',
      ru: 'Портрет',
      hi: 'पोर्ट्रेट छवि',
      id: 'Gambar Potret',
      de: 'Porträtbild',
      vi: 'Ảnh chân dung',
      tr: 'Portre Resmi',
      it: 'Immagine ritratto'
    }
  })

  /** 输入端口：驱动音频 */
  readonly audioInput = new InputPort('audio', {
    accepts: [AudioFileValue],
    label: {
      zh: '驱动音频',
      en: 'Driving Audio',
      ja: '駆動音声',
      ko: '드라이빙 오디오',
      es: 'Audio de conducción',
      ar: 'صوت محرك',
      fr: 'Audio de conduite',
      pt: 'Áudio de condução',
      ru: 'Водящий аудио',
      hi: 'ड्राइविंग ऑडियो',
      id: 'Audio Penggerak',
      de: 'Antriebsaudio',
      vi: 'Âm thanh điều khiển',
      tr: 'Sürüş Ses',
      it: 'Audio di guida'
    }
  })

  /** 输出端口：生成的视频 */
  readonly videoOutput = new OutputPort('video', VideoFileValue, {
    zh: '对口型视频',
    en: 'Lip-sync Video',
    ja: 'リップシンク動画',
    ko: '립싱크 비디오',
    es: 'Video de sincronización labial',
    ar: 'فيديو مزامنة الشفاه',
    fr: 'Vidéo de synchronisation labiale',
    pt: 'Vídeo de sincronização labial',
    ru: 'Видео синхронизации губ',
    hi: 'लिप-सिंक वीडियो',
    id: 'Video Sinkronisasi Bibir',
    de: 'Lippensynchronisationsvideo',
    vi: 'Video đồng bộ môi',
    tr: 'Dudak Senkronizasyonu Videosu',
    it: 'Video sincronizzazione labiale'
  })

  /** 方法端口：外部触发一次生成 */
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

  private workspaceId = ''    // 业务空间 ID（MAAS 端点必填）
  private resolution: S2VResolution = DEFAULT_RESOLUTION
  /** 是否先调 detect 检测图片合规性（可选，开启更安全） */
  private enableDetect = true

  // —— 运行态 ——

  private status: S2VStatus = 'idle'
  private errorMessage = ''
  private resultFile: File | null = null
  private resultHash = ''
  /** 轮询时的中间状态提示（如 "PENDING: 排队中..."） */
  private statusHint = ''

  /** stale-call 保护 */
  private requestId = 0
  private abortController: AbortController | null = null
  /** 轮询定时器句柄，cancel / beforeDestroy 时 clear */
  private pollTimer: ReturnType<typeof setTimeout> | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.imageInput)
    this.addInput(this.audioInput)
    this.addOutput(this.videoOutput)
    this.addMethod(this.generateMethod)
    this.generateMethod.onTrigger(() => this.manualTrigger())
    this.setBox(260, 280)
  }

  // —— UI 读写 ——

  get displayWorkspaceId(): string { return this.workspaceId }
  setWorkspaceId(v: string): void {
    const trimmed = v.trim()
    if (this.workspaceId === trimmed) return
    this.workspaceId = trimmed
    this.notifyChanged()
  }

  get displayResolution(): S2VResolution { return this.resolution }
  setResolution(v: S2VResolution): void {
    if (!RESOLUTIONS.includes(v)) return
    if (this.resolution === v) return
    this.resolution = v
    this.notifyChanged()
  }
  get availableResolutions(): readonly S2VResolution[] { return RESOLUTIONS }

  get displayEnableDetect(): boolean { return this.enableDetect }
  setEnableDetect(v: boolean): void {
    if (this.enableDetect === v) return
    this.enableDetect = v
    this.notifyChanged()
  }

  get displayStatus(): S2VStatus { return this.status }
  get displayError(): string { return this.errorMessage }
  get displayStatusHint(): string { return this.statusHint }
  get previewFile(): File | null { return this.resultFile }
  get previewHash(): string { return this.resultHash }

  get hasDashscopeKey(): boolean {
    return readImageProviderKey('dashscope').length > 0
  }
  get hasWorkspaceId(): boolean {
    return this.workspaceId.length > 0
  }
  get hasProviderKey(): boolean {
    return this.hasDashscopeKey && this.hasWorkspaceId
  }

  get displayImageConnected(): boolean {
    return this.imageInput.incomingEdgeCount > 0
  }
  get displayAudioConnected(): boolean {
    return this.audioInput.incomingEdgeCount > 0
  }

  // —— 触发生成 ——

  manualTrigger(): void {
    void this.doGenerate()
  }

  cancel(): void {
    this.requestId++
    this.abortController?.abort()
    this.abortController = null
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    if (this.status !== 'idle' && this.status !== 'done' && this.status !== 'error') {
      this.status = 'idle'
      this.errorMessage = ''
      this.statusHint = ''
      this.failRun()
      this.notifyChanged()
    }
  }

  /** 核心流程：上传 → 检测（可选）→ 提交 → 轮询 → 下载 → commit */
  private async doGenerate(): Promise<void> {
    const apiKey = readImageProviderKey('dashscope')
    if (!apiKey) {
      this.status = 'error'
      this.errorMessage = '请先在图片生成节点的设置里填写阿里云百炼的 API Key'
      this.notifyChanged()
      return
    }
    if (!this.workspaceId.trim()) {
      this.status = 'error'
      this.errorMessage = '请先填写业务空间 ID（Workspace ID）——可在百炼控制台「业务空间」页面找到'
      this.notifyChanged()
      return
    }

    const [imageValue] = this.imageInput.value
    const [audioValue] = this.audioInput.value
    if (!(imageValue instanceof ImgFileValue) || !imageValue.file) {
      this.status = 'error'
      this.errorMessage = '请连接人物图片到左侧输入端口'
      this.notifyChanged()
      return
    }
    if (!(audioValue instanceof AudioFileValue) || !audioValue.file) {
      this.status = 'error'
      this.errorMessage = '请连接驱动音频到左侧输入端口'
      this.notifyChanged()
      return
    }

    // 音频大小检查
    if (audioValue.file.size > MAX_AUDIO_BYTES) {
      this.status = 'error'
      this.errorMessage = `音频文件过大（${(audioValue.file.size / 1024 / 1024).toFixed(1)}MB），百炼限制 15MB`
      this.notifyChanged()
      return
    }

    const myRequestId = ++this.requestId
    const controller = new AbortController()
    this.abortController = controller
    const signal = controller.signal

    try {
      this.beginRun()

      // —— Step 1: 上传图片和音频 ——
      this.status = 'uploading'
      this.statusHint = '上传图片...'
      this.errorMessage = ''
      this.notifyChanged()

      const modelName = 'wan2.2-s2v' // 上传时必须指定模型

      let imageOssUrl = ''
      let audioOssUrl = ''
      try {
        imageOssUrl = await uploadToDashscope(imageValue.file, modelName, apiKey, signal)
        if (this.requestId !== myRequestId) return // stale

        this.statusHint = '上传音频...'
        this.notifyChanged()
        audioOssUrl = await uploadToDashscope(audioValue.file, modelName, apiKey, signal)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        throw err
      }
      if (this.requestId !== myRequestId) return

      // —— Step 2: 检测图片合规性（可选）——
      if (this.enableDetect) {
        this.status = 'detecting'
        this.statusHint = '检测图片合规性...'
        this.notifyChanged()

        const detectUrl = `https://${this.workspaceId.trim()}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/image2video/face-detect`
        const detectRes = await fetch(detectUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-OssResourceResolve': 'enable'
          },
          body: JSON.stringify({
            model: 'wan2.2-s2v-detect',
            input: { image_url: imageOssUrl }
          }),
          signal
        })
        if (this.requestId !== myRequestId) return

        const detectData = await detectRes.json()
        const detectOutput = detectData?.output ?? {}
        if (!detectRes.ok || detectOutput.check_pass !== true) {
          const msg = detectOutput.message ?? detectData?.message ?? '图片检测不通过：请确保是清晰的单人正面照'
          this.status = 'error'
          this.errorMessage = `图片检测失败：${msg}`
          this.failRun()
          this.notifyChanged()
          return
        }
      }

      // —— Step 3: 提交异步任务 ——
      this.status = 'submitting'
      this.statusHint = '提交视频生成任务...'
      this.notifyChanged()

      const submitUrl = `https://${this.workspaceId.trim()}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis`
      const submitRes = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
          'X-DashScope-OssResourceResolve': 'enable'
        },
        body: JSON.stringify({
          model: 'wan2.2-s2v',
          input: {
            image_url: imageOssUrl,
            audio_url: audioOssUrl
          },
          parameters: {
            resolution: this.resolution
          }
        }),
        signal
      })
      if (this.requestId !== myRequestId) return

      if (!submitRes.ok) {
        const body = await submitRes.json().catch(() => ({}))
        const msg = body?.output?.message ?? body?.message ?? `提交任务失败（${submitRes.status}）`
        throw new Error(String(msg))
      }

      const submitData = await submitRes.json()
      const taskId = submitData?.output?.task_id
      if (!taskId) {
        throw new Error('提交成功但未拿到 task_id')
      }

      // —— Step 4: 轮询任务状态 ——
      this.status = 'polling'
      this.statusHint = `排队中...（约 5-10 分钟）`
      this.notifyChanged()

      const videoUrl = await this.pollUntilDone(taskId, apiKey, myRequestId)
      if (!videoUrl) {
        // polling 内部已经处理了 FAILED / stale 情况
        return
      }
      if (this.requestId !== myRequestId) return

      // —— Step 5: 下载视频 ——
      this.statusHint = '下载视频...'
      this.notifyChanged()

      const videoFile = await downloadAsFile(videoUrl, `s2v-${Date.now()}.mp4`, signal)
      if (this.requestId !== myRequestId) return

      const bytes = new Uint8Array(await videoFile.arrayBuffer())
      const hash = djb2(bytesToBase64(bytes))

      // —— Step 6: commit ——
      this.resultFile = videoFile
      this.resultHash = hash
      this.videoOutput.commit(new VideoFileValue(videoFile, hash))
      this.status = 'done'
      this.errorMessage = ''
      this.statusHint = ''
      this.completeRun()
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        this.status = 'idle'
        this.errorMessage = ''
      } else {
        this.status = 'error'
        this.errorMessage = (err as Error).message || String(err)
        this.failRun()
      }
    } finally {
      if (this.abortController === controller) this.abortController = null
      if (this.requestId === myRequestId) this.notifyChanged()
    }
  }

  /** 轮询直到任务完成，返回视频 URL 或 null（stale / cancelled） */
  private async pollUntilDone(
    taskId: string,
    apiKey: string,
    myRequestId: number
  ): Promise<string | null> {
    const controller = this.abortController
    if (!controller) return null
    const signal = controller.signal

    // 先等一个短间隔，因为任务刚提交可能还没入库
    await new Promise<void>((resolve, reject) => {
      this.pollTimer = setTimeout(resolve, 3000)
      signal.addEventListener('abort', () => {
        this.pollTimer && clearTimeout(this.pollTimer)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })
    this.pollTimer = null
    if (signal.aborted || this.requestId !== myRequestId) return null

    while (true) {
      const { status, videoUrl, error } = await queryTaskStatus(
        this.workspaceId.trim(), taskId, apiKey, signal
      )
      if (this.requestId !== myRequestId) return null

      switch (status) {
        case 'SUCCEEDED':
          if (!videoUrl) {
            this.status = 'error'
            this.errorMessage = '任务成功但未返回 video_url'
            return null
          }
          return videoUrl

        case 'FAILED':
          this.status = 'error'
          this.errorMessage = `视频生成失败：${error ?? '未知错误'}`
          this.failRun()
          return null

        case 'CANCELED':
          this.status = 'error'
          this.errorMessage = '任务已取消'
          return null

        case 'UNKNOWN':
          // 任务可能过期了（超过 24 小时）
          this.status = 'error'
          this.errorMessage = '任务状态未知，可能已过期（超过 24 小时未完成）'
          return null

        case 'RUNNING':
          this.statusHint = '生成中...'
          break
        case 'PENDING':
          this.statusHint = '排队中...'
          break
      }
      this.notifyChanged()

      // 等下一个轮询周期
      await new Promise<void>((resolve, reject) => {
        this.pollTimer = setTimeout(resolve, POLL_INTERVAL_MS)
        signal.addEventListener('abort', () => {
          this.pollTimer && clearTimeout(this.pollTimer)
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
      this.pollTimer = null
      if (signal.aborted || this.requestId !== myRequestId) return null
    }
  }

  // —— 文件拖入 ——

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean { return false }
  onFileDrop(_sourcePath: string): void { /* 不处理 */ }

  // —— 端口变化 ——

  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    this.notifyChanged()
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      workspaceId: this.workspaceId,
      resolution: this.resolution,
      enableDetect: this.enableDetect
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.workspaceId === 'string') this.workspaceId = state.workspaceId.trim()
    if (typeof state.resolution === 'string' && RESOLUTIONS.includes(state.resolution as S2VResolution)) {
      this.resolution = state.resolution as S2VResolution
    }
    if (typeof state.enableDetect === 'boolean') this.enableDetect = state.enableDetect
  }

  beforeDestroy(): void {
    this.cancel()
    super.beforeDestroy()
  }
}
