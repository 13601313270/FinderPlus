import { BoolValue } from '../../engine/data/BoolValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { useOssBuckets } from '../../../renderer/src/composables/useOssBuckets'

/** 节点运行状态（UI 据此决定按钮可点 / 结果区样式） */
export type OssExistsStatus = 'idle' | 'running' | 'done' | 'error'

/**
 * 阿里云 OSS 文件存在性检查节点：接入 objectKey（StringValue），通过 ali-oss SDK
 * 的 head 接口判断 bucket 内该对象是否存在，输出 BoolValue。
 *
 * 配置字段（节点 state 持久化）：bucketId（全局 OSS Bucket 配置引用）、
 * 自动发送开关。
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

  /** 引用全局 Bucket 配置的 id */
  private bucketId = ''
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

  get displayBucketId(): string { return this.bucketId }
  get displayBucketName(): string {
    const { getLabel } = useOssBuckets()
    return getLabel(this.bucketId)
  }
  get displayAutoSend(): boolean { return this.autoSend }

  get displayStatus(): OssExistsStatus { return this.status }
  get displayLastError(): string { return this.lastError }
  get displayLastExists(): boolean | null { return this.lastExists }
  get displayLastObjectKey(): string { return this.lastObjectKey }
  get displayLastMeta(): { size?: number; lastModified?: string; etag?: string; contentType?: string } | null {
    return this.lastMeta
  }

  /** 是否已填好必须的配置（bucketId 指向了全局已配置完整的 Bucket） */
  get hasConfig(): boolean {
    const { isConfigured } = useOssBuckets()
    return isConfigured(this.bucketId)
  }

  // —— 用户操作 ——

  setBucketId(v: string): void { if (this.bucketId !== v) { this.bucketId = v; this.notifyChanged() } }
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

    // 2. 反查 Bucket 配置
    const { find } = useOssBuckets()
    const bucket = find(this.bucketId)
    if (!bucket) {
      this.status = 'error'
      this.lastError = '请先在设置中配置 Bucket'
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
        accessKeyId: bucket.accessKeyId,
        accessKeySecret: bucket.accessKeySecret,
        region: bucket.region,
        bucket: bucket.bucket,
        endpoint: bucket.endpoint || undefined,
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
      this.existsOutput.commit(new BoolValue(result.exists), { force: true })
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
      ...super.saveState(),
      bucketId: this.bucketId,
      autoSend: this.autoSend
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    if (typeof state.bucketId === 'string') this.bucketId = state.bucketId
    if (typeof state.autoSend === 'boolean') this.autoSend = state.autoSend
  }
}
