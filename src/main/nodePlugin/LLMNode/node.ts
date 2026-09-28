import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/**
 * 大语言模型节点：
 * 接受 system prompt 和 user prompt 两个字符串输入，
 * 输出一条 LLM 回复字符串。
 *
 * API Key 从 localStorage 读取（canvasdesk.llm.api_key），
 * 所有 LLMNode 实例共享一份，不存节点自身。
 *
 * Stale-call 取消策略：用递增的 requestId 标记每次请求，
 * 并发的后发请求回来时 ID 不匹配就丢弃，避免旧响应覆盖新响应。
 */

type LLMStatus = 'idle' | 'loading' | 'done' | 'error'

const STORAGE_KEY = 'canvasdesk.llm.api_key'
const API_URL = 'https://api.deepseek.com/chat/completions'
const MODEL = 'deepseek-flash'

export class LLMNode extends Node {
  static readonly TYPE = 'llm'
  readonly type = LLMNode.TYPE

  /** 输入端口：系统提示词 */
  readonly systemInput = new InputPort('system', { accepts: [StringValue], label: 'System' })

  /** 输入端口：用户提示词 */
  readonly promptInput = new InputPort('prompt', { accepts: [StringValue], label: 'Prompt' })

  /** 输出端口：模型回复 */
  readonly textOutput = new OutputPort('text', StringValue, '回复')

  private response = ''
  private status: LLMStatus = 'idle'
  private errorMessage = ''

  /** 请求序列号，用于防止 stale 响应覆盖新响应 */
  private requestId = 0

  /** 防抖定时器：两个输入端口快速连续到达时合并成一次 fetch */
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.systemInput)
    this.addInput(this.promptInput)
    this.addOutput(this.textOutput)
    // 内容区硬约束：手柄 + 状态行 + 输出区
    this.setBox(260, 200)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 当前展示的 LLM 响应（或错误信息） */
  get displayResponse(): string {
    if (this.status === 'error') return this.errorMessage
    return this.response
  }

  /** 当前状态 —— UI 读它决定显示 loading spinner / 普通输出 / 错误样式 */
  get displayStatus(): LLMStatus {
    return this.status
  }

  /**
   * 上游任意一个输入端口有新值到达，合并成一次 LLM 推理。
   * 两个输入可能异步到达（上游 commit 顺序不定），
   * 用 300ms 防抖窗口把快速连续的两次触发合并成一次，避免白烧 token。
   */
  inputPortReceiveValue(_ports: InputPort[]): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this.doFetch()
    }, 300)
  }

  /** 真正执行取值 + 检查 + fetch；由防抖定时器触发 */
  private doFetch(): void {
    const [sysFirst] = this.systemInput.value
    const [promptFirst] = this.promptInput.value

    const system = sysFirst instanceof StringValue ? sysFirst.value : ''
    const prompt = promptFirst instanceof StringValue ? promptFirst.value : ''

    // Key 检查
    const apiKey = this.readApiKey()
    if (!apiKey) {
      this.status = 'error'
      this.errorMessage = '请先点击右上角齿轮配置 LLM API Key'
      this.response = ''
      this.notifyChanged()
      return
    }

    // 空 prompt 不浪费 token
    if (!prompt.trim()) {
      this.status = 'idle'
      this.response = ''
      this.errorMessage = ''
      this.notifyChanged()
      return
    }

    // 递增请求 ID，标记"这是最新的一次请求"
    const myRequestId = ++this.requestId
    void this.fetchAndCommit(apiKey, system, prompt, myRequestId)
  }

  /** 读 localStorage 里的全局 API Key */
  private readApiKey(): string {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  }

  /** 异步调用 DeepSeek API，完成后写 response + commit 到输出端口 */
  private async fetchAndCommit(
    apiKey: string,
    system: string,
    prompt: string,
    myRequestId: number
  ): Promise<void> {
    // 先标记 loading，UI 会显示 spinner
    this.status = 'loading'
    this.errorMessage = ''
    this.notifyChanged()

    let resultText = ''
    let errMsg = ''
    let ok = false

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: system || 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ],
          stream: false
        })
      })

      const data = await res.json()

      if (!res.ok) {
        errMsg = data?.error?.message ?? `请求失败（${res.status} ${res.statusText}）`
      } else {
        const content: string | undefined = data?.choices?.[0]?.message?.content
        if (typeof content === 'string') {
          resultText = content
          ok = true
        } else {
          errMsg = '响应格式异常：未拿到 content 字段'
        }
      }
    } catch (err) {
      errMsg = err instanceof Error ? err.message : '网络请求异常'
    }

    // —— Stale-call 守卫 ——
    // 如果此时 requestId 已经不是 myRequestId，说明用户又触发了新请求，
    // 这次回来的结果就丢弃，不覆盖 UI / 不 commit 到输出端口
    if (this.requestId !== myRequestId) return

    if (ok) {
      this.response = resultText
      this.status = 'done'
      this.textOutput.commit(new StringValue(resultText))
    } else {
      this.response = ''
      this.errorMessage = errMsg
      this.status = 'error'
    }
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    // response / status 都是上游派生出来的，恢复时上游 commit 会自动刷回来
    return {}
  }

  readState(_state: Record<string, unknown>): void {
    // 啥也不做——派生状态等上游恢复后自然会刷新
  }

  /** 节点销毁时清理防抖定时器，防止卸载后还触发 fetch */
  async beforeDestroy(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    // 废弃所有未完成请求：递增 requestId，让 in-flight 的 fetch 回来时自然丢弃
    this.requestId++
  }
}
