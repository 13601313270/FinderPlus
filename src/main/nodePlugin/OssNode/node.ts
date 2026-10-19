import { StringValue } from '../../engine/data/StringValue'
import { FileValue } from '../../engine/data/FileValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** 节点运行状态（UI 据此决定按钮可点 / 结果区样式） */
export type OssStatus = 'idle' | 'running' | 'done' | 'error'

/** 默认签名 URL 有效期（秒）—— 1 年 */
const DEFAULT_SIGN_EXPIRES = 365 * 24 * 3600

/** 从文件名（可带路径）提取后缀，含点号，如 '.png'；无后缀返回 '' */
function getExtension(filename: string): string {
  const name = filename.split(/[/\\]/).pop() ?? ''
  const dot = name.lastIndexOf('.')
  // 要求：有点号、不在开头（不是 .hiddenfile 那种）、后缀长度 1-10
  if (dot > 0 && dot >= name.length - 11) {
    return name.slice(dot).toLowerCase()
  }
  return ''
}

/** 判断文件名（可带路径）是否已带后缀 */
function hasExtension(name: string): boolean {
  return getExtension(name).length > 0
}

/**
 * 阿里云 OSS 上传节点：接入任意 FileValue，用源文件名直接上传到 bucket，输出可访问 URL。
 *
 * 配置字段（节点 state 持久化）：AccessKeyId / AccessKeySecret / Region / Bucket / Endpoint /
 * 是否签名 URL / 签名有效期。
 *
 * 触发方式：
 * 1. 点击卡片上的「上传」按钮
 * 2. autoSend 开关开启时，上游值变更自动触发
 *
 * 去重：相同文件指纹 + 相同文件名不重复上传，直接 commit 上次的 URL 给下游。
 */
export class OssNode extends Node {
  static readonly TYPE = 'oss-upload'
  readonly type = OssNode.TYPE

  // —— 端口 ——

  /** 输入端口：任意 FileValue（文件、图片、文本文件都可以） */
  readonly fileInput = new InputPort('source', {
    accepts: [FileValue],
    label: { zh: '文件', en: 'File' }
  })

  /** 输入端口（可选）：自定义 OSS objectKey。接入后覆盖源文件自身的文件名。 */
  readonly fileNameInput = new InputPort('filename', {
    accepts: [StringValue],
    label: { zh: '文件名', en: 'Filename' }
  })

  /** 输出端口：上传后的 URL */
  readonly urlOutput = new OutputPort('url', StringValue, {
    zh: 'URL',
    en: 'URL'
  })

  /** 方法端口：上游 commit 任意值即触发一次上传 */
  readonly triggerPort = new MethodPort('trigger', {
    label: { zh: '上传', en: 'Upload' }
  })

  // —— 持久化配置 ——

  private accessKeyId = ''
  private accessKeySecret = ''
  private region = ''
  private bucket = ''
  private endpoint = ''
  /** 是否用 signatureUrl 生成带签名的长期链接（bucket 私有时必须开） */
  private signUrl = false
  /** 签名有效期（秒）；signUrl=true 时生效 */
  private signExpires = DEFAULT_SIGN_EXPIRES
  /** 是否自动发送（上游值变了立即上传；默认关，避免误触发） */
  private autoSend = false

  // —— 运行时状态（不持久化）——

  private status: OssStatus = 'idle'
  private lastError = ''
  private lastUrl = ''
  private lastObjectKey = ''
  private lastUploadedFingerprint: string | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.fileInput)
    this.addInput(this.fileNameInput)
    this.addOutput(this.urlOutput)
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
  get displaySignUrl(): boolean { return this.signUrl }
  get displaySignExpires(): number { return this.signExpires }
  get displayAutoSend(): boolean { return this.autoSend }

  get displayStatus(): OssStatus { return this.status }
  get displayLastError(): string { return this.lastError }
  get displayLastUrl(): string { return this.lastUrl }
  get displayLastObjectKey(): string { return this.lastObjectKey }

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
  setSignUrl(v: boolean): void { if (this.signUrl !== v) { this.signUrl = v; this.notifyChanged() } }
  setSignExpires(v: number): void {
    const clamped = Math.max(60, Math.min(365 * 24 * 3600 * 10, Math.round(v)))
    if (clamped !== this.signExpires) { this.signExpires = clamped; this.notifyChanged() }
  }
  setAutoSend(v: boolean): void { if (this.autoSend !== v) { this.autoSend = v; this.notifyChanged() } }

  // —— 输入端口回调 ——

  inputPortReceiveValue(_ports: InputPort[]): void {
    this.notifyChanged()
    if (this.autoSend) {
      void this.run()
    }
  }

  // —— 核心：上传 ——

  /**
   * 执行上传。按钮、MethodPort、autoSend 路径都走这里。
   * object key 直接用源文件名（file.name），不做路径模板处理。
   */
  async run(): Promise<void> {
    // 1. 取源文件
    const [first] = this.fileInput.value
    if (!(first instanceof FileValue) || first.isNull || !first.file) {
      this.status = 'error'
      this.lastError = '未接入文件输入'
      this.notifyChanged()
      return
    }

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

    // 4. 决定 objectKey：优先用 fileNameInput 自定义名，否则走源文件名
    const [namePort] = this.fileNameInput.value
    let objectKey: string
    if (namePort instanceof StringValue && !namePort.isNull && namePort.value?.trim()) {
      objectKey = namePort.value.trim()
      // 自定义名不带后缀 → 从源文件名推断后缀拼上
      if (!hasExtension(objectKey)) {
        const srcExt = getExtension(first.file.name)
        if (srcExt) objectKey += srcExt
      }
    } else {
      objectKey = first.file.name
    }
    // 清洗：去掉开头的 /（OSS key 不应以 / 开头）
    objectKey = objectKey.replace(/^\/+/, '')

    // 5. 去重：相同文件指纹 + 相同 objectKey 不重复上传
    if (this.lastUploadedFingerprint === first.fingerprint && this.lastObjectKey === objectKey) {
      if (this.lastUrl) {
        this.urlOutput.commit(new StringValue(this.lastUrl))
      }
      this.notifyChanged()
      return
    }

    // 6. 读文件 → base64（分块避免 reduce 拼接 O(n²)）
    let base64 = ''
    try {
      const bytes = new Uint8Array(await first.file.arrayBuffer())
      let binary = ''
      const CHUNK = 0x8000 // 32KB — V8 call stack 安全上限
      for (let i = 0; i < bytes.length; i += CHUNK) {
        const segment = bytes.subarray(i, Math.min(i + CHUNK, bytes.length))
        binary += String.fromCharCode.apply(null, segment as unknown as number[])
      }
      base64 = btoa(binary)
    } catch (err) {
      this.status = 'error'
      this.lastError = `读取文件失败：${err instanceof Error ? err.message : String(err)}`
      this.notifyChanged()
      return
    }

    // 7. 调主进程上传
    this.beginRun()
    this.status = 'running'
    this.lastError = ''
    this.notifyChanged()

    let result:
      | { ok: true; url: string; objectKey: string; etag?: string }
      | { ok: false; error: string }
    try {
      // @ts-ignore — 渲染进程里 window.ossApi 一定存在
      result = await window.ossApi.upload({
        accessKeyId: this.accessKeyId,
        accessKeySecret: this.accessKeySecret,
        region: this.region,
        bucket: this.bucket,
        endpoint: this.endpoint || undefined,
        objectKey,
        base64Data: base64,
        contentType: first.file.type || undefined,
        signUrl: this.signUrl,
        signExpires: this.signExpires
      })
    } catch (err) {
      this.failRun()
      result = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }

    if (result.ok) {
      this.status = 'done'
      this.lastUrl = result.url
      this.lastObjectKey = result.objectKey
      this.lastUploadedFingerprint = first.fingerprint
      this.urlOutput.commit(new StringValue(result.url))
      this.completeRun()
    } else {
      this.status = 'error'
      this.lastError = result.error
      this.failRun()
    }
    this.notifyChanged()
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      accessKeyId: this.accessKeyId,
      accessKeySecret: this.accessKeySecret,
      region: this.region,
      bucket: this.bucket,
      endpoint: this.endpoint,
      signUrl: this.signUrl,
      signExpires: this.signExpires,
      autoSend: this.autoSend
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.accessKeyId === 'string') this.accessKeyId = state.accessKeyId
    if (typeof state.accessKeySecret === 'string') this.accessKeySecret = state.accessKeySecret
    if (typeof state.region === 'string') this.region = state.region
    if (typeof state.bucket === 'string') this.bucket = state.bucket
    if (typeof state.endpoint === 'string') this.endpoint = state.endpoint
    if (typeof state.signUrl === 'boolean') this.signUrl = state.signUrl
    if (typeof state.signExpires === 'number') {
      this.signExpires = Math.max(60, Math.min(365 * 24 * 3600 * 10, Math.round(state.signExpires)))
    }
    if (typeof state.autoSend === 'boolean') this.autoSend = state.autoSend
  }
}
