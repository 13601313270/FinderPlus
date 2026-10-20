import { BoolValue } from '../../engine/data/BoolValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** 节点运行状态（UI 据此决定按钮可点 / 结果区样式） */
export type OssExistsStatus = 'idle' | 'running' | 'done' | 'error'

/**
 * 阿里云 OSS 文件存在性检查节点：接入 objectKey（StringValue），通过 ali-oss SDK
 * 的 head 接口判断 bucket 内该对象是否存在，输出 BoolValue。
 *
 * 配置字段（节点 state 持久化）：AccessKeyId / AccessKeySecret / Region / Bucket / Endpoint。
 *
 * 触发方式：
 * 1. 点击卡片上的「检查」按钮
 * 2. autoSend 开关开启时，上游 objectKey 变更自动触发
 */
export class OssExistsNode extends Node {
  static readonly TYPE = 'oss-exists'
  readonly type = OssExistsNode.TYPE

  // —— 端口 ——

  /** 输入端口：OSS objectKey（如 uploads/photo.jpg） */
  readonly objectKeyInput = new InputPort('key', {
    accepts: [StringValue],
    label: { zh: '对象 Key', en: 'Object Key' }
  })

  /** 输出端口：是否存在 */
  readonly existsOutput = new OutputPort('exists', BoolValue, {
    zh: '存在',
    en: 'Exists'
  })

  /** 方法端口：上游 commit 任意值即触发一次检查 */
  readonly triggerPort = new MethodPort('trigger', {
    label: { zh: '检查', en: 'Check' }
  })

  // —— 持久化配置 ——

  private accessKeyId = ''
  private accessKeySecret = ''
  private region = ''
  private bucket = ''
  private endpoint = ''
  /** 是否自动发送（objectKey 变了立即检查；默认关，避免误触发） */
  private autoSend = false

  // —— 运行时状态（不持久化）——

  private status: OssExistsStatus = 'idle'
  private lastError = ''
  private lastExists: boolean | null = null
  private lastObjectKey = ''
  private lastMeta: { size?: number; lastModified?: string; etag?: string; contentType?: string } | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.objectKeyInput)
    this.addOutput(this.existsOutput)
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

  get displayStatus(): OssExistsStatus { return this.status }
  get displayLastError(): string { return this.lastError }
  get displayLastExists(): boolean | null { return this.lastExists }
  get displayLastObjectKey(): string { return this.lastObjectKey }
  get displayLastMeta(): { size?: number; lastModified?: string; etag?: string; contentType?: string } | null {
    return this.lastMeta
  }

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

  // —— 核心：检查存在性 ——

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

    // 4. 调主进程 head
    this.beginRun()
    this.status = 'running'
    this.lastError = ''
    this.notifyChanged()

    let result:
      | { ok: true; exists: false }
      | { ok: true; exists: true; size?: number; lastModified?: string; etag?: string; contentType?: string }
      | { ok: false; error: string }
    try {
      // @ts-ignore — 渲染进程里 window.ossApi 一定存在
      result = await window.ossApi.head({
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

    if (result.ok) {
      this.status = 'done'
      this.lastObjectKey = objectKey
      this.lastExists = result.exists
      if (result.exists) {
        this.lastMeta = {
          size: result.size,
          lastModified: result.lastModified,
          etag: result.etag,
          contentType: result.contentType
        }
      } else {
        this.lastMeta = null
      }
      this.existsOutput.commit(new BoolValue(result.exists))
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
      autoSend: this.autoSend
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.accessKeyId === 'string') this.accessKeyId = state.accessKeyId
    if (typeof state.accessKeySecret === 'string') this.accessKeySecret = state.accessKeySecret
    if (typeof state.region === 'string') this.region = state.region
    if (typeof state.bucket === 'string') this.bucket = state.bucket
    if (typeof state.endpoint === 'string') this.endpoint = state.endpoint
    if (typeof state.autoSend === 'boolean') this.autoSend = state.autoSend
  }
}
