import { base64ToBlob, base64ToBytes } from '../../engine/data/base64'
import { FileValue } from '../../engine/data/FileValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** 节点运行状态（UI 据此决定按钮可点 / 结果区样式） */
export type OssDownloadStatus = 'idle' | 'running' | 'done' | 'error'

/** 从 OSS objectKey 提取文件名最后一段 */
function extractFileName(objectKey: string): string {
  const trimmed = objectKey.replace(/^\/+/, '')
  const lastSlash = trimmed.lastIndexOf('/')
  return lastSlash >= 0 ? trimmed.slice(lastSlash + 1) : trimmed
}

/** 计算 SHA-256 hex 摘要（用 Web Crypto API） */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // 新版 TS 的 Uint8Array 泛型与旧 DOM BufferSource 定义不兼容，强转
  const buf = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 阿里云 OSS 下载节点：接入 objectKey（StringValue），从 bucket 拉取对象内容，
 * 输出 FileValue 给下游文件类节点使用。
 *
 * 配置字段（节点 state 持久化）：AccessKeyId / AccessKeySecret / Region / Bucket / Endpoint。
 *
 * 触发方式：
 * 1. 点击卡片上的「下载」按钮
 * 2. autoSend 开关开启时，上游 objectKey 变更自动触发
 */
export class OssDownloadNode extends Node {
  static readonly TYPE = 'oss-download'
  readonly type = OssDownloadNode.TYPE

  // —— 端口 ——

  /** 输入端口：OSS objectKey（如 uploads/photo.jpg） */
  readonly objectKeyInput = new InputPort('key', {
    accepts: [StringValue],
    label: { zh: '对象 Key', en: 'Object Key' }
  })

  /** 输出端口：下载到的文件（FileValue） */
  readonly fileOutput = new OutputPort('file', FileValue, {
    zh: '文件',
    en: 'File'
  })

  /** 方法端口：上游 commit 任意值即触发一次下载 */
  readonly triggerPort = new MethodPort('trigger', {
    label: { zh: '下载', en: 'Download' }
  })

  // —— 持久化配置 ——

  private accessKeyId = ''
  private accessKeySecret = ''
  private region = ''
  private bucket = ''
  private endpoint = ''
  /** 是否自动发送（objectKey 变了立即下载；默认关，避免误触发） */
  private autoSend = false

  // —— 运行时状态（不持久化）——

  private status: OssDownloadStatus = 'idle'
  private lastError = ''
  private lastObjectKey = ''
  private lastFileName = ''
  private lastContentType = ''
  private lastFileSize = 0

  constructor(id: string) {
    super(id)
    this.addInput(this.objectKeyInput)
    this.addOutput(this.fileOutput)
    this.addMethod(this.triggerPort)
    this.triggerPort.onTrigger(() => { void this.run() })
    this.setBox(180, 180)
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean { return false }
  onFileDrop(_sourcePath: string): void { /* 不处理 */ }

  // —— 渲染层读的状态 ——

  get displayAccessKeyId(): string { return this.accessKeyId }
  get displayAccessKeySecret(): string { return this.accessKeySecret }
  get displayRegion(): string { return this.region }
  get displayBucket(): string { return this.bucket }
  get displayEndpoint(): string { return this.endpoint }
  get displayAutoSend(): boolean { return this.autoSend }

  get displayStatus(): OssDownloadStatus { return this.status }
  get displayLastError(): string { return this.lastError }
  get displayLastObjectKey(): string { return this.lastObjectKey }
  get displayLastFileName(): string { return this.lastFileName }
  get displayLastContentType(): string { return this.lastContentType }
  get displayLastFileSize(): number { return this.lastFileSize }

  /** 是否已填好必须的配置（accessKeyId / secret / region / bucket 四项） */
  get hasConfig(): boolean {
    return !!this.accessKeyId.trim()
      && !!this.accessKeySecret.trim()
      && !!this.region.trim()
      && !!this.bucket.trim()
  }

  // —— 用户操作 ——

  setAccessKeyId(v: string): void { if (this.accessKeyId !== v) { this.accessKeyId = v; this.notifyChanged() } }
  setAccessKeySecret(v: string): void { if (this.accessKeySecret !== v) { this.accessKeySecret = v; this.notifyChanged() } }
  setRegion(v: string): void { if (this.region !== v) { this.region = v; this.notifyChanged() } }
  setBucket(v: string): void { if (this.bucket !== v) { this.bucket = v; this.notifyChanged() } }
  setEndpoint(v: string): void { if (this.endpoint !== v) { this.endpoint = v; this.notifyChanged() } }
  setAutoSend(v: boolean): void { if (this.autoSend !== v) { this.autoSend = v; this.notifyChanged() } }

  // —— 输入端口回调 ——

  inputPortReceiveValue(_ports: InputPort[]): void {
    this.notifyChanged()
    if (this.autoSend) {
      void this.run()
    }
  }

  // —— 核心：下载 ——

  async run(): Promise<void> {
    // 1. 取 objectKey
    const [first] = this.objectKeyInput.value
    if (!(first instanceof StringValue) || first.isNull || !first.value?.trim()) {
      this.status = 'error'
      this.lastError = '未接入对象 Key'
      this.notifyChanged()
      return
    }
    const objectKey = first.value.trim()

    // 2. 必须配置项检查
    if (!this.hasConfig) {
      this.status = 'error'
      this.lastError = '请先配置 AccessKey / Region / Bucket'
      this.notifyChanged()
      this.failRun()
      return
    }

    // 3. running guard
    if (this.status === 'running') return

    // 4. 调主进程 get
    this.beginRun()
    this.status = 'running'
    this.lastError = ''
    this.notifyChanged()

    let result:
      | { ok: true; base64: string; contentType?: string; etag?: string; objectKey: string }
      | { ok: false; error: string }
    try {
      // @ts-ignore — 渲染进程里 window.ossApi 一定存在
      result = await window.ossApi.get({
        accessKeyId: this.accessKeyId,
        accessKeySecret: this.accessKeySecret,
        region: this.region,
        bucket: this.bucket,
        endpoint: this.endpoint || undefined,
        objectKey
      })
    } catch (err) {
      this.failRun()
      result = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }

    if (!result.ok) {
      this.status = 'error'
      this.lastError = result.error
      this.failRun()
      this.notifyChanged()
      return
    }

    // 5. base64 → 字节 → Blob → File → FileValue
    try {
      const bytes = base64ToBytes(result.base64)
      const contentType = result.contentType || 'application/octet-stream'
      const fileName = extractFileName(result.objectKey) || 'downloaded-file'
      const blob = base64ToBlob(result.base64, contentType)
      const file = new File([blob], fileName, { type: contentType })
      const fingerprint = await sha256Hex(bytes)

      this.fileOutput.commit(new FileValue(file, fingerprint))
      this.status = 'done'
      this.lastObjectKey = result.objectKey
      this.lastFileName = fileName
      this.lastContentType = contentType
      this.lastFileSize = bytes.length
      this.completeRun()
    } catch (err) {
      this.status = 'error'
      this.lastError = `构造文件失败：${err instanceof Error ? err.message : String(err)}`
      this.failRun()
    }
    this.notifyChanged()
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      ...super.saveState(),
      accessKeyId: this.accessKeyId,
      accessKeySecret: this.accessKeySecret,
      region: this.region,
      bucket: this.bucket,
      endpoint: this.endpoint,
      autoSend: this.autoSend
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    if (typeof state.accessKeyId === 'string') this.accessKeyId = state.accessKeyId
    if (typeof state.accessKeySecret === 'string') this.accessKeySecret = state.accessKeySecret
    if (typeof state.region === 'string') this.region = state.region
    if (typeof state.bucket === 'string') this.bucket = state.bucket
    if (typeof state.endpoint === 'string') this.endpoint = state.endpoint
    if (typeof state.autoSend === 'boolean') this.autoSend = state.autoSend
  }
}
