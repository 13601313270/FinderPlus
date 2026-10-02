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
 * API Key 从 localStorage 读取（canvasdesk.llm.api_key），
 * 所有 LLMNode 实例共享一份，不存节点自身。
 *
 * Stale-call 取消策略：用递增的 requestId 标记每次请求，
 * 并发的后发请求回来时 ID 不匹配就丢弃，避免旧响应覆盖新响应。
 */

type LLMStatus = 'idle' | 'loading' | 'done' | 'error'

interface StoredLLMConfig {
  provider: 'deepseek' | 'openai' | 'kimi' | 'qwen' | 'glm' | 'minimax' | 'groq' | 'mistral' | 'siliconflow'
  providers: Record<string, { key: string; model: string }>
}

const CONFIG_KEY = 'canvasdesk.llm.config'
const LEGACY_KEY = 'canvasdesk.llm.api_key'

/** Provider 预设（与渲染层 useLLMSettings 的 LLM_PROVIDERS 保持一致） */
const PROVIDER_PRESETS: Record<string, { url: string; defaultModel: string }> = {
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-flash'
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini'
  },
  kimi: {
    url: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'moonshot-v1-8k'
  },
  qwen: {
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-plus'
  },
  glm: {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4'
  },
  minimax: {
    url: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    defaultModel: 'abab6.5s-chat'
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile'
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-small-latest'
  },
  siliconflow: {
    url: 'https://api.siliconflow.cn/v1/chat/completions',
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct'
  }
}

/** 从 localStorage 读当前生效的 API 端点配置，带旧版 key 兼容 */
function readEndpoint(): { key: string; url: string; model: string } {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const cfg = JSON.parse(raw) as StoredLLMConfig
      const provider = cfg.provider
      const preset = PROVIDER_PRESETS[provider]
      const providerCfg = cfg.providers?.[provider]
      if (preset && providerCfg) {
        const model = (providerCfg.model && providerCfg.model.trim()) || preset.defaultModel
        return { key: providerCfg.key ?? '', url: preset.url, model }
      }
    }
  } catch {
    // fall through
  }
  // 旧版兼容：只有 api_key，按 deepseek 处理
  const legacyKey = localStorage.getItem(LEGACY_KEY) ?? ''
  const preset = PROVIDER_PRESETS.deepseek
  return { key: legacyKey, url: preset.url, model: preset.defaultModel }
}

export class LLMNode extends Node {
  static readonly TYPE = 'llm'
  readonly type = LLMNode.TYPE

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
      ru: 'Система'
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
      ru: 'Пользовательский промпт'
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
    ru: 'Ответ'
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
    // 内容区硬约束：手柄 + 控制栏 + 输出 + 底部操作栏（左输入框 + 右发送）
    this.setBox(320, 280)
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
    // promptInput 接了边时优先用端口值
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
    const endpoint = readEndpoint()

    // Key 检查
    if (!endpoint.key) {
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
    void this.fetchAndCommit(endpoint, system, prompt, myRequestId)
  }

  /** 异步调用当前配置的 Provider API，完成后写 response + commit 到输出端口 */
  private async fetchAndCommit(
    endpoint: { key: string; url: string; model: string },
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
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${endpoint.key}`
        },
        body: JSON.stringify({
          model: endpoint.model,
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
    return { autoCall: this.autoCall, localPrompt: this.localPrompt }
  }

  readState(state: Record<string, unknown>): void {
    // 布尔开关用 typeof === 'boolean' 判断，避免把用户显式 false 当成缺省覆盖
    if (typeof state.autoCall === 'boolean') {
      this.autoCall = state.autoCall
    }
    // localPrompt 是普通字符串，只有确实存了才恢复
    if (typeof state.localPrompt === 'string') {
      this.localPrompt = state.localPrompt
    }
    // response / status 等派生状态等上游恢复后自然会刷新
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
