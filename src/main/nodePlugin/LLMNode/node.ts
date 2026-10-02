import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/**
 * 大语言模型节点：
 * - system prompt 从上游 InputPort 传入
 * - prompt 支持两种来源：上游 InputPort（接了边就用它）或节点内部文本框（没接边时用）
 * - 输出一条 LLM 回复字符串
 *
 * 架构（v2）：
 * - Provider 选择、Model 名称、JSON 输出模式 → 节点级配置（存 saveState/readState）
 * - API Key → 全局配置（localStorage canvasdesk.llm.config），所有节点共享各 provider 的 key
 *
 * Stale-call 取消策略：用递增的 requestId 标记每次请求，
 * 并发的后发请求回来时 ID 不匹配就丢弃，避免旧响应覆盖新响应。
 */

type LLMStatus = 'idle' | 'loading' | 'done' | 'error'

export type LLMProviderId =
  | 'deepseek' | 'openai' | 'kimi' | 'qwen' | 'glm'
  | 'minimax' | 'groq' | 'mistral' | 'siliconflow'

const CONFIG_KEY = 'canvasdesk.llm.config'
const LEGACY_KEY = 'canvasdesk.llm.api_key'

/** Provider 预设（与渲染层 useLLMSettings 的 LLM_PROVIDERS 保持一致） */
const PROVIDER_PRESETS: Record<LLMProviderId, { url: string; defaultModel: string }> = {
  deepseek:    { url: 'https://api.deepseek.com/chat/completions',                          defaultModel: 'deepseek-flash' },
  openai:      { url: 'https://api.openai.com/v1/chat/completions',                           defaultModel: 'gpt-4o-mini' },
  kimi:        { url: 'https://api.moonshot.cn/v1/chat/completions',                           defaultModel: 'moonshot-v1-8k' },
  qwen:        { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',   defaultModel: 'qwen-plus' },
  glm:         { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',                defaultModel: 'glm-4' },
  minimax:     { url: 'https://api.minimax.chat/v1/text/chatcompletion_v2',                   defaultModel: 'abab6.5s-chat' },
  groq:        { url: 'https://api.groq.com/openai/v1/chat/completions',                       defaultModel: 'llama-3.3-70b-versatile' },
  mistral:     { url: 'https://api.mistral.ai/v1/chat/completions',                            defaultModel: 'mistral-small-latest' },
  siliconflow: { url: 'https://api.siliconflow.cn/v1/chat/completions',                        defaultModel: 'Qwen/Qwen2.5-7B-Instruct' }
}

/** 节点可用的 provider 列表（遍历这个就行） */
export const ALL_PROVIDERS: readonly LLMProviderId[] = Object.keys(PROVIDER_PRESETS) as LLMProviderId[]

/** 按 provider 从全局配置取 API Key（localStorage） */
function readProviderKey(provider: LLMProviderId): string {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const cfg = JSON.parse(raw) as { providers?: Record<string, { key?: string }> }
      return cfg.providers?.[provider]?.key ?? ''
    }
  } catch {
    // fall through
  }
  // 旧版兼容：只有 legacy api_key，按 deepseek 处理
  if (provider === 'deepseek') {
    return localStorage.getItem(LEGACY_KEY) ?? ''
  }
  return ''
}

/** 从节点级 provider + model 算出最终的 URL 和 model 名 */
function resolveEndpoint(
  provider: LLMProviderId,
  model: string
): { url: string; model: string } {
  const preset = PROVIDER_PRESETS[provider]
  return {
    url: preset.url,
    model: (model && model.trim()) || preset.defaultModel
  }
}

export class LLMNode extends Node {
  static readonly TYPE = 'llm'
  readonly type = LLMNode.TYPE

  // —— 节点级配置 ——
  private provider: LLMProviderId = 'deepseek'
  private model = ''       // 空串表示用 PROVIDER_PRESETS[provider].defaultModel
  private jsonMode = false // 仅 deepseek 有效

  /** 输入端口：系统提示词 */
  readonly systemInput = new InputPort('system', {
    accepts: [StringValue],
    label: {
      zh: '系统设定system',
      en: 'System',
      ja: 'システム設定',
      ko: '시스템 설정',
      es: 'Sistema',
      ar: 'النظام',
      fr: 'Système',
      pt: 'Sistema',
      ru: 'Система',
      hi: 'सिस्टम',
      id: 'Sistem',
      de: 'System',
      vi: 'Hệ thống',
      tr: 'Sistem',
      it: 'Sistema'
    }
  })

  /** 输入端口：用户提示词（接了边就用端口值，没接边就用内部文本框） */
  readonly promptInput = new InputPort('prompt', {
    accepts: [StringValue],
    label: {
      zh: '用户设定prompt',
      en: 'User prompt',
      ja: 'ユーザープロンプト',
      ko: '사용자 프롬프트',
      es: 'Prompt de usuario',
      ar: 'موجه المستخدم',
      fr: 'Prompt utilisateur',
      pt: 'Prompt de usuário',
      ru: 'Пользовательский промпт',
      hi: 'उपयोगकर्ता prompt',
      id: 'Prompt pengguna',
      de: 'Benutzer-prompt',
      vi: 'Prompt người dùng',
      tr: 'Kullanıcı prompt’u',
      it: 'Prompt utente'
    }
  })

  /** 输出端口：模型回复 */
  readonly textOutput = new OutputPort('text', StringValue, {
    zh: '回复',
    en: 'Reply',
    ja: '返信',
    ko: '응답',
    es: 'Respuesta',
    ar: 'رد',
    fr: 'Réponse',
    pt: 'Resposta',
    ru: 'Ответ',
    hi: 'उत्तर',
    id: 'Balasan',
    de: 'Antwort',
    vi: 'Trả lời',
    tr: 'Yanıt',
    it: 'Risposta'
  })

  /** 内部 prompt 文本（仅 promptInput 未接边时使用） */
  private localPrompt = ''

  private response = ''
  private status: LLMStatus = 'idle'
  private errorMessage = ''

  /** 请求序列号，用于防止 stale 响应覆盖新响应 */
  private requestId = 0

  /** 防抖定时器：两个输入端口快速连续到达时合并成一次 fetch */
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  /** 是否自动调用：收到上游输入时自动触发 fetch；默认 false，需用户手动点发送按钮 */
  private autoCall = false

  constructor(id: string) {
    super(id)
    this.addInput(this.systemInput)
    this.addInput(this.promptInput)
    this.addOutput(this.textOutput)
    this.setBox(320, 280)
  }

  // —— 节点级配置的 getter / setter ——

  get displayProvider(): LLMProviderId { return this.provider }
  setProvider(v: LLMProviderId): void {
    if (this.provider === v) return
    this.provider = v
    this.notifyChanged()
  }

  get displayModel(): string { return this.model }
  setModel(v: string): void {
    if (this.model === v) return
    this.model = v
    this.notifyChanged()
  }

  get displayJsonMode(): boolean { return this.jsonMode }
  setJsonMode(v: boolean): void {
    if (this.jsonMode === v) return
    this.jsonMode = v
    this.notifyChanged()
  }

  /** 当前 provider 是否已配全局 Key —— UI 读它决定是否显示警告 */
  get hasProviderKey(): boolean {
    return readProviderKey(this.provider).length > 0
  }

  /** 当前是否自动调用 —— UI 读它决定是显示发送按钮还是静默自动 */
  get displayAutoCall(): boolean {
    return this.autoCall
  }

  /** 设置自动调用开关；UI 切换时调用 */
  setAutoCall(value: boolean): void {
    if (this.autoCall === value) return
    this.autoCall = value
    this.notifyChanged()
  }

  /** promptInput 是否接了边 —— UI 据此决定显示内部文本框还是隐藏 */
  get displayPromptConnected(): boolean {
    return this.promptInput.incomingEdgeCount > 0
  }

  /** 当前内部 prompt 内容（UI 渲染用） */
  get displayLocalPrompt(): string {
    return this.localPrompt
  }

  /** 设置内部 prompt；UI 文本框 change 事件调用 */
  setPrompt(text: string): void {
    this.localPrompt = text
    this.notifyChanged()
  }

  /** 手动触发推理；UI 的发送按钮点击时调用 */
  manualTrigger(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.doFetch()
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
   * 上游任意一个输入端口有新值到达。
   * 仅当 autoCall 为 true 时才自动触发（300ms 防抖窗口合并快速到达的输入），
   * 否则等用户手动点发送按钮。
   */
  inputPortReceiveValue(_ports: InputPort[]): void {
    if (!this.autoCall) return
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this.doFetch()
    }, 300)
  }

  /**
   * 解析 prompt：接了端口 → 用端口值；否则用内部文本框。
   * system 始终从端口取（system 没有内部 fallback）。
   */
  private resolveInputs(): { system: string; prompt: string } {
    const [sysFirst] = this.systemInput.value
    const system = sysFirst instanceof StringValue ? sysFirst.value : ''

    let prompt = this.localPrompt
    if (this.promptInput.incomingEdgeCount > 0) {
      const [promptFirst] = this.promptInput.value
      if (promptFirst instanceof StringValue) {
        prompt = promptFirst.value
      }
    }
    return { system, prompt }
  }

  /** 真正执行取值 + 检查 + fetch；由防抖定时器或手动触发 */
  private doFetch(): void {
    const { system, prompt } = this.resolveInputs()
    const key = readProviderKey(this.provider)

    if (!key) {
      this.status = 'error'
      this.errorMessage = `请在全局设置中为 ${PROVIDER_PRESETS[this.provider].url} 配置 API Key`
      this.response = ''
      this.notifyChanged()
      return
    }

    if (!prompt.trim()) {
      this.status = 'idle'
      this.response = ''
      this.errorMessage = ''
      this.notifyChanged()
      return
    }

    const { url, model } = resolveEndpoint(this.provider, this.model)
    const myRequestId = ++this.requestId
    void this.fetchAndCommit(key, url, model, system, prompt, myRequestId)
  }

  /** 异步调用 Provider API，完成后写 response + commit 到输出端口 */
  private async fetchAndCommit(
    key: string,
    url: string,
    model: string,
    system: string,
    prompt: string,
    myRequestId: number
  ): Promise<void> {
    this.status = 'loading'
    this.errorMessage = ''
    this.notifyChanged()

    let resultText = ''
    let errMsg = ''
    let ok = false

    try {
      const body: Record<string, unknown> = {
        model,
        messages: [
          { role: 'system', content: system || 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        stream: false
      }

      if (this.provider === 'deepseek' && this.jsonMode) {
        body.response_format = { type: 'json_object' }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(body)
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
    return {
      provider: this.provider,
      model: this.model,
      jsonMode: this.jsonMode,
      autoCall: this.autoCall,
      localPrompt: this.localPrompt
    }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.provider === 'string' && PROVIDER_PRESETS[state.provider as LLMProviderId]) {
      this.provider = state.provider as LLMProviderId
    }
    if (typeof state.model === 'string') {
      this.model = state.model
    }
    if (typeof state.jsonMode === 'boolean') {
      this.jsonMode = state.jsonMode
    }
    if (typeof state.autoCall === 'boolean') {
      this.autoCall = state.autoCall
    }
    if (typeof state.localPrompt === 'string') {
      this.localPrompt = state.localPrompt
    }
  }

  /** 节点销毁时清理防抖定时器，防止卸载后还触发 fetch */
  async beforeDestroy(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.requestId++
  }
}
