/**
 * 图像生成 Provider 预设：引擎节点与渲染层共用的**单一真相源**。
 *
 * 与 LLM 的 chat completions 不同，文生图各家请求体 / 响应体差异明显，
 * 所以用 shape 区分协议分支：
 * - 'openai'          POST { model, prompt, n, size } → data[0].b64_json | data[0].url
 * - 'siliconflow'     POST { model, prompt, batch_size, image_size } → images[0].url
 * - 'zhipu'           POST { model, prompt, size } → data[0].url
 * - 'dashscope-sync'  阿里云百炼同步协议 POST { model, input: { messages }, parameters }
 *                     → output.choices[0].message.content[0].image（URL，24 小时有效）
 * - 'dashscope-async' 阿里云百炼异步任务：POST 带 X-DashScope-Async: enable 拿 task_id，
 *                     再轮询 GET /api/v1/tasks/{task_id} 到 SUCCEEDED → output.results[0].url
 *
 * 百炼的 size 用 `*` 分隔（如 1024*1024），本文件统一按 `x` 存，仅在下发请求体时转换，
 * 这样节点内下拉、上游尺寸端口值、其他 provider 三处格式一致。
 *
 * sizes 的**第一项即该模型的默认尺寸**——不同模型支持的尺寸范围差别很大，
 * 默认值必须跟着模型走，不能全局写死一个。尺寸表按各家官方文档整理，按需增删。
 */

export type ImageProviderId = 'siliconflow' | 'openai' | 'glm' | 'dashscope' | 'tokenplan'

export type ImageRequestShape = 'openai' | 'siliconflow' | 'zhipu' | 'dashscope-sync' | 'dashscope-async'

export interface ImageModelPreset {
  /** 该模型支持的尺寸选项；第一项即默认尺寸 */
  readonly sizes: readonly string[]
  /** 是否可带 response_format: 'b64_json'（gpt-image-1 不支持该字段，它本身回 b64） */
  readonly supportsBase64Response?: boolean
  /** 单个模型的协议覆盖：同一家下同步 / 异步混用时用（如百炼的 qwen-image 同步、万相 2.5 异步） */
  readonly shape?: ImageRequestShape
  /**
   * 支持的参考图（图生图 / 编辑）最大张数。
   * 0 / 未配 = 不支持传参考图。
   * 当前覆盖：百炼 sync 的 qwen-image-2.0-pro/2in1/2.0（上限 3）、wan2.6-image（上限 4）。
   * 端口会据此做数量校验，超上限直接报错而不是静默截断。
   */
  readonly maxReferenceImages?: number
  /**
   * 百炼 Wan2.6 特有的 enable_interleave 参数控制：
   * - 'edit'      → 有参考图时设 enable_interleave=false（图像编辑模式，1~4 张图）
   *                 无参考图时不会走到这个分支（接口要求编辑模式必须带图）
   * - 'interleave' → enable_interleave=true（文图交错 / 纯文生图，0~1 张图）
   * 未配时不发送该参数（qwen-image 系列不需要）。
   */
  readonly dashscopeEnableInterleave?: 'edit' | 'interleave'
}

export interface ImageProviderPreset {
  readonly label: string
  /** images/generations 端点（POST） */
  readonly url: string
  readonly shape: ImageRequestShape
  /**
   * 异步任务提交地址；仅 dashscope-async 需要，缺省时用 url。
   * 注：百炼各地域域名不通用，这里默认华北2（北京）的经典域名；
   * 若你在新加坡/弗吉尼亚地域开 Key，改这一个字段（含 taskUrlPrefix）即可。
   */
  readonly asyncUrl?: string
  /** 异步任务查询地址前缀，拼上 task_id 即为查询接口 */
  readonly taskUrlPrefix?: string
  /**
   * 远程拉取可用模型列表的端点（GET，可选）。
   * 各家格式不同：
   * - OpenAI 兼容（siliconflow / openai / glm / tokenplan compatible-mode）→ data[].id
   * - 百炼原生（dashscope / tokenplan 非 compatible）→ output.models[].model
   * 缺省时 UI 只展示本地硬编码的 models。
   */
  readonly modelsUrl?: string
  readonly models: Readonly<Record<string, ImageModelPreset>>
  readonly defaultModel: string
}

export const IMAGE_PROVIDERS: Readonly<Record<ImageProviderId, ImageProviderPreset>> = {
  siliconflow: {
    label: '硅基流动 (SiliconFlow)',
    url: 'https://api.siliconflow.cn/v1/images/generations',
    modelsUrl: 'https://api.siliconflow.cn/v1/models',
    shape: 'siliconflow',
    defaultModel: 'black-forest-labs/FLUX.2-pro',
    models: {}
  },
  openai: {
    label: 'OpenAI (GPT-Image)',
    url: 'https://api.openai.com/v1/images/generations',
    modelsUrl: 'https://api.openai.com/v1/models',
    shape: 'openai',
    defaultModel: 'gpt-image-1',
    models: {}
  },
  glm: {
    label: '智谱 (GLM-Image / CogView)',
    url: 'https://open.bigmodel.cn/api/paas/v4/images/generations',
    modelsUrl: 'https://open.bigmodel.cn/api/paas/v4/models',
    shape: 'zhipu',
    defaultModel: 'glm-image',
    models: {}
  },
  dashscope: {
    label: '阿里云百炼 (通义千问 / 万相)',
    url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    asyncUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
    taskUrlPrefix: 'https://dashscope.aliyuncs.com/api/v1/tasks/',
    modelsUrl: 'https://dashscope.aliyuncs.com/api/v1/models',
    shape: 'dashscope-sync',
    defaultModel: 'qwen-image-3.0-pro',
    models: {}
  },
  tokenplan: {
    label: '千问 Token Plan',
    url: 'https://token-plan.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    asyncUrl: 'https://token-plan.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
    taskUrlPrefix: 'https://token-plan.cn-beijing.maas.aliyuncs.com/api/v1/tasks/',
    modelsUrl: 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/models',
    shape: 'dashscope-sync',
    defaultModel: 'qwen-image-3.0-pro',
    models: {}
  }
}

/** 未知模型（预设已下线 / 存量脏数据）时的兜底尺寸 */
export const FALLBACK_IMAGE_SIZES: readonly string[] = ['1024x1024']

/**
 * 图像配置的 localStorage 键。
 * 格式（对齐 LLM 全局配置）：
 *   { providers: { siliconflow: { key: "..." }, openai: { key: "" }, ... } }
 * 只存各 provider 的 API Key；provider / model 选择在节点级配置里。
 */
export const IMAGE_CONFIG_KEY = 'canvasdesk.image.config'

/** 各 provider key 的全局存储结构（对外导出，供渲染层 useImageSettings 共用） */
export interface ImageGlobalConfig {
  providers: Record<ImageProviderId, { key: string }>
}

/**
 * 旧格式（v1）→ 新格式（v2）的一次性迁移，幂等。
 *
 * 旧格式：{ provider, providers: { siliconflow: { key, model }, ... } }
 * 新格式：{ providers: { siliconflow: { key }, ... } }
 *
 * 判定依据：旧格式 providers[*] 里有 model 字段；新格式只有 key。
 * 迁移完把旧格式备份到 canvasdesk.image.config.backup，覆盖 IMAGE_CONFIG_KEY。
 */
function migrateLegacyImageConfig(): void {
  const raw = localStorage.getItem(IMAGE_CONFIG_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const providers = parsed.providers
    if (!providers || typeof providers !== 'object') return
    const firstChild = Object.values(providers)[0] as Record<string, unknown> | undefined
    // 有 model 字段 → 旧格式；或者存在顶层 provider 字段 → 旧格式
    const hasModel = firstChild && typeof firstChild === 'object' && 'model' in firstChild
    if (!hasModel && !('provider' in parsed)) return // 已经是新格式
    // 备份旧内容
    localStorage.setItem(`${IMAGE_CONFIG_KEY}.backup`, raw)
    // 构造新格式
    const base: ImageGlobalConfig = defaultImageGlobalConfig()
    const oldProviders = providers as Record<string, { key?: string }>
    for (const p of Object.keys(IMAGE_PROVIDERS) as ImageProviderId[]) {
      base.providers[p].key = typeof oldProviders[p]?.key === 'string' ? oldProviders[p]!.key! : ''
    }
    localStorage.setItem(IMAGE_CONFIG_KEY, JSON.stringify(base))
  } catch {
    // 解析失败 → 不动，后续用空配置兜底
  }
}

/** 新格式默认配置：每家 provider 一个空 key 槽位 */
function defaultImageGlobalConfig(): ImageGlobalConfig {
  const providers = {} as Record<ImageProviderId, { key: string }>
  for (const p of Object.keys(IMAGE_PROVIDERS) as ImageProviderId[]) {
    providers[p] = { key: '' }
  }
  return { providers }
}

/** 按 provider 从全局配置取 API Key（引擎层调用） */
export function readImageProviderKey(providerId: ImageProviderId): string {
  try {
    migrateLegacyImageConfig()
    const raw = localStorage.getItem(IMAGE_CONFIG_KEY)
    if (raw) {
      const cfg = JSON.parse(raw) as Partial<ImageGlobalConfig>
      return cfg.providers?.[providerId]?.key ?? ''
    }
  } catch {
    // fall through
  }
  return ''
}

/**
 * 当前生效的图像端点配置；由节点级 (provider, model) + 全局 key + 预设元信息拼出来。
 */
export interface ResolvedImageEndpoint {
  provider: ImageProviderId
  label: string
  /** 实际用于发请求的地址：同步协议即同步端点，异步协议是任务提交地址 */
  requestUrl: string
  /** 异步任务查询地址前缀（仅异步协议有值） */
  taskUrlPrefix: string
  shape: ImageRequestShape
  key: string
  model: string
  sizes: readonly string[]
  defaultSize: string
  supportsBase64Response: boolean
  /** 当前模型支持的参考图（图生图 / 编辑）最大张数；0 = 不支持 */
  maxReferenceImages: number
  /** Wan2.6 特有的 enable_interleave 控制；undefined = 不发送该参数 */
  dashscopeEnableInterleave?: 'edit' | 'interleave'
}

/**
 * 组装图像端点配置：
 * @param providerId  节点级选的 provider
 * @param modelOverride 节点级选的模型（空串或不认时回落到该 provider 的 defaultModel）
 */
export function readImageEndpoint(
  providerId: ImageProviderId,
  modelOverride = ''
): ResolvedImageEndpoint {
  const preset = IMAGE_PROVIDERS[providerId] ?? IMAGE_PROVIDERS.siliconflow
  const key = readImageProviderKey(providerId)

  // 模型选择逻辑：
  // 1. 用户显式传了 modelOverride 且非空 → 用它
  // 2. 远程缓存里有 defaultModel 且缓存非空 → 从缓存里取（校验它在远程可用）
  // 3. 兜底 → 用 preset.defaultModel（纯字符串，不再查本地字典）
  const remoteCached = getCachedImageModels(providerId)
  let model: string
  if (modelOverride?.trim()) {
    model = modelOverride.trim()
  } else if (remoteCached && remoteCached.includes(preset.defaultModel)) {
    model = preset.defaultModel
  } else {
    model = preset.defaultModel
  }

  // 本地 models 字典已清空，所有模型元数据一律走兜底
  // （尺寸等信息各服务商 models API 不返回，只能给 FALLBACK，让引擎层用默认尺寸请求）
  const modelPreset: ImageModelPreset = { sizes: FALLBACK_IMAGE_SIZES }
  const sizes = FALLBACK_IMAGE_SIZES
  const shape = preset.shape
  const isAsyncTask = shape === 'dashscope-async'

  let requestUrl = isAsyncTask ? preset.asyncUrl ?? preset.url : preset.url
  let taskUrlPrefix = isAsyncTask ? preset.taskUrlPrefix ?? '' : ''

  return {
    provider: providerId,
    label: preset.label,
    requestUrl,
    taskUrlPrefix,
    shape,
    key,
    model,
    sizes,
    defaultSize: sizes[0],
    supportsBase64Response: modelPreset.supportsBase64Response ?? false,
    maxReferenceImages: modelPreset.maxReferenceImages ?? 0,
    dashscopeEnableInterleave: modelPreset.dashscopeEnableInterleave
  }
}

/** 统一尺寸格式：本文件一律用 `x` 存，发给百炼时转成它要求的 `*` */
function toDashscopeSize(size: string): string {
  return size.trim().replace('×', '*').replace(/x/i, '*')
}

/** 请求头：异步协议必须显式开启任务模式，其余只有鉴权 + JSON */
export function buildImageRequestHeaders(endpoint: ResolvedImageEndpoint): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${endpoint.key}`
  }
  if (endpoint.shape === 'dashscope-async') {
    headers['X-DashScope-Async'] = 'enable'
  }
  return headers
}

/**
 * 按各家的协议拼请求体——字段名不一样，别用一套 body 打天下。
 *
 * @param referenceImages 参考图数组（每张是 base64 字符串，不含 data: 前缀；或远端 URL）。
 *                        仅 dashscope-sync 形态会塞到 content 数组里，其余分支忽略。
 *                        空数组 / 未传等于纯文生图，向后兼容。
 */
export function buildImageRequestBody(
  endpoint: ResolvedImageEndpoint,
  prompt: string,
  size: string,
  referenceImages?: readonly string[]
): Record<string, unknown> {
  switch (endpoint.shape) {
    case 'siliconflow':
      // 硅基流动用 image_size / batch_size，不是 OpenAI 的 size / n
      return { model: endpoint.model, prompt, image_size: size, batch_size: 1 }
    case 'zhipu':
      // 智谱不支持 n，尺寸字段名就是 size
      return { model: endpoint.model, prompt, size }
    case 'dashscope-sync': {
      // 同步协议（qwen-image 系列、Wan2.6）：messages 结构 + prompt_extend / watermark / enable_interleave
      // 多张参考图与 text 并列放在 content 数组里，百炼按数组顺序逐个识别。
      // 注意：百炼要求 image 字段只能是以下两种之一：
      //   ① 公网 URL：http://... 或 https://...
      //   ② Data URI：data:{mime_type};base64,{base64_data}  ← 必须带前缀！
      // 纯 base64 串会被百炼拒绝，所以 node.ts 的 resolveReferenceImages 里已经拼好前缀。
      const content: Array<Record<string, string>> = [{ text: prompt }]
      for (const ref of referenceImages ?? []) {
        const trimmed = ref.trim()
        if (trimmed) content.push({ image: trimmed })
      }

      // Wan2.6 特有的 enable_interleave：
      // - 'edit' 模式 → enable_interleave=false（有参考图即图像编辑；接口要求编辑模式必须带图，
      //   node.ts 在 maxReferenceImages 检查阶段已拦截"无图选了 edit"的情况）
      // - 'interleave' 模式 → enable_interleave=true（纯文生图 / 文图交错输出，0~1 张图）
      // 未配时（qwen-image 系列）不传该参数
      const refCount = referenceImages?.filter(r => r.trim()).length ?? 0
      let enableInterleave: boolean | undefined
      if (endpoint.dashscopeEnableInterleave === 'edit') {
        // 编辑模式：有参考图 → false（编辑），无参考图 → true（退回文图交错/纯文生图）
        enableInterleave = refCount === 0
      } else if (endpoint.dashscopeEnableInterleave === 'interleave') {
        enableInterleave = true
      }

      const parameters: Record<string, unknown> = {
        size: toDashscopeSize(size),
        n: 1,
        prompt_extend: true,
        watermark: false
      }
      if (enableInterleave !== undefined) parameters.enable_interleave = enableInterleave

      return {
        model: endpoint.model,
        input: { messages: [{ role: 'user', content }] },
        parameters
      }
    }
    case 'dashscope-async':
      // 异步任务协议（万相 2.5 及更早）走的是另一套 body：input.prompt，没有 messages
      return {
        model: endpoint.model,
        input: { prompt },
        parameters: { size: toDashscopeSize(size), n: 1 }
      }
    default:
      return {
        model: endpoint.model,
        prompt,
        n: 1,
        size,
        ...(endpoint.supportsBase64Response ? { response_format: 'b64_json' } : {})
      }
  }
}

/** 安全取对象视图：响应体结构由各家决定，取值前一律先收窄类型 */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function firstArrayItem(value: unknown): unknown {
  return Array.isArray(value) && value.length > 0 ? value[0] : undefined
}

/** 从错误响应体里抠出可读的错误信息；抠不到返回 undefined，由调用方拼兜底文案 */
export function extractImageErrorMessage(data: unknown): string | undefined {
  const body = asRecord(data)
  if (!body) return undefined
  // 百炼的失败任务把 code / message 放在 output 里，其他家放在 error / 顶层
  const output = asRecord(body.output)
  const candidates = [
    asRecord(body.error)?.message,
    output?.message,
    body.message,
    asRecord(body.error)?.code,
    output?.code
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) return candidate
  }
  return undefined
}

export interface ExtractedImage {
  /** 内联 base64（OpenAI b64_json） */
  base64?: string
  /** 远端图片 URL（各家 url 形态；有效期有限，需尽快下载） */
  url?: string
  /** 都没取到时的原因 */
  error?: string
}

/**
 * 从响应体里取出图片数据。
 * 先按 shape 对应的字段取，取不到再退到其他候选位置——provider 改版时不至于直接判成失败。
 */
export function extractImageResult(shape: ImageRequestShape, data: unknown): ExtractedImage {
  const root = asRecord(data)
  const output = asRecord(root?.output)
  // 百炼同步协议：output.choices[0].message.content[].image
  const messageContent = asRecord(asRecord(firstArrayItem(output?.choices))?.message)?.content

  const candidates: unknown[] =
    shape === 'siliconflow'
      ? [firstArrayItem(root?.images), firstArrayItem(root?.data)]
      : shape === 'dashscope-sync'
        ? [firstArrayItem(messageContent), firstArrayItem(output?.results), firstArrayItem(root?.data)]
        : shape === 'dashscope-async'
          ? [firstArrayItem(output?.results), firstArrayItem(messageContent), firstArrayItem(root?.data)]
          : [firstArrayItem(root?.data), firstArrayItem(root?.images)]

  for (const candidate of candidates) {
    const item = asRecord(candidate)
    if (!item) continue
    if (typeof item.b64_json === 'string' && item.b64_json) return { base64: item.b64_json }
    // 百炼的图片字段叫 image，其余家叫 url
    for (const key of ['url', 'image'] as const) {
      const value = item[key]
      if (typeof value === 'string' && value) return { url: value }
    }
  }
  return { error: '响应里没找到图片数据（b64_json / url / image）' }
}

/** 异步任务提交响应里取 task_id */
export function extractTaskId(data: unknown): string | undefined {
  const taskId = asRecord(asRecord(data)?.output)?.task_id
  return typeof taskId === 'string' && taskId ? taskId : undefined
}

/** 异步任务状态：PENDING / RUNNING / SUCCEEDED / FAILED；UNKNOWN 表示任务已过期（超过 24h） */
export function extractTaskStatus(data: unknown): string {
  const status = asRecord(asRecord(data)?.output)?.task_status
  return typeof status === 'string' ? status : ''
}

// —— 远程模型列表拉取 ——

/** 模型列表缓存 TTL（毫秒）：5 分钟内复用 */
const REMOTE_MODEL_CACHE_TTL_MS = 5 * 60 * 1000

/** 模块级缓存：按 provider 存远程返回的模型 ID + 时间戳 */
interface RemoteModelCacheEntry { ids: string[]; fetchedAt: number }
const remoteModelCache = new Map<ImageProviderId, RemoteModelCacheEntry>()

/**
 * 清空某个 provider 的缓存；不传则清空全部。
 * UI 想强制刷新时调这个。
 */
export function clearRemoteImageModelCache(providerId?: ImageProviderId): void {
  if (providerId) remoteModelCache.delete(providerId)
  else remoteModelCache.clear()
}

/**
 * 解析 OpenAI 兼容响应：{ data: [{ id: "xxx" }] }
 */
function parseOpenAICompatibleModels(body: unknown): string[] {
  const data = Array.isArray(asRecord(body)?.data) ? (asRecord(body)!.data as unknown[]) : []
  const ids: string[] = []
  for (const item of data) {
    const id = (item as Record<string, unknown>)?.id
    if (typeof id === 'string' && id.trim()) ids.push(id.trim())
  }
  return ids
}

/**
 * 判断模型 ID 是否属于生图 / 生视频（兜底过滤——OpenAI 兼容格式没 capabilities 字段时用）。
 * 基于模型 ID 关键词匹配，不追求 100% 精确；本地白名单优先，这里只兜底。
 */
function isGenerativeMediaModelId(id: string): boolean {
  const lower = id.toLowerCase()
  // 生图 / 生视频特征词（任一命中即保留）
  const positive = [
    'image', 'img', 'flux', 'wan', 'wanx', 'dall', 'cogview', 'kolors',
    'seedream', 'creative', 'diffusion', 'sdxl', 'stable-diffusion',
    'z-image', 'text-to-image', 'video-to-image', 'text-to-video',
    'kandinsky', 'luma', 'runway', 'pika', 'vidu', 'kling', 'pixverse'
  ]
  for (const kw of positive) if (lower.includes(kw)) return true
  return false
}

/**
 * 从远程拉回来的全量模型 ID 中，过滤掉明确非生图 / 生视频的那些。
 * 本地 models 已清空，全部走关键词判断。
 */
function filterRemoteMediaModels(
  ids: string[],
  _providerId: ImageProviderId
): string[] {
  return ids.filter(isGenerativeMediaModelId)
}

/**
 * 解析百炼原生响应：
 *   { success, output: { models: [{ model, capabilities: [...] }] } }
 * 如果 capabilities 里有 IG（Image Generation）就收进来；没带 capabilities 字段的也默认收下。
 */
function parseDashscopeNativeModels(body: unknown): string[] {
  const root = asRecord(body)
  if (!root) return []
  if (root.success === false) return []
  const output = asRecord(root.output)
  if (!output) return []
  const models = Array.isArray(output.models) ? (output.models as unknown[]) : []
  const ids: string[] = []
  for (const m of models) {
    const rec = asRecord(m)
    if (!rec) continue
    const modelId = rec.model
    if (typeof modelId !== 'string' || !modelId.trim()) continue
    const caps = Array.isArray(rec.capabilities) ? (rec.capabilities as string[]) : undefined
    if (caps && caps.length > 0 && !caps.includes('IG')) continue
    ids.push(modelId.trim())
  }
  return ids
}

/**
 * 判断 provider 的 models 端点走哪种格式。
 * 百炼原生（dashscope / tokenplan）→ 带 capabilities 筛选的 native 格式
 * 其他 → OpenAI 兼容格式
 */
function resolveImageModelsFormat(providerId: ImageProviderId): 'dashscope-native' | 'openai-compatible' {
  // 只有阿里云百炼（dashscope）原生端点走百炼格式；
  // 千问 Token Plan 的 models 端点在 compatible-mode 下，返回 OpenAI 兼容结构。
  if (providerId === 'dashscope') return 'dashscope-native'
  return 'openai-compatible'
}

/**
 * 拉取某个 provider 远程可用的图像模型 ID 列表。
 * 自动处理百炼的 capabilities=IG 筛选和分页。
 *
 * @returns 去重后的模型 ID 数组；失败返回空数组 + error 信息
 */
export async function fetchImageModels(
  providerId: ImageProviderId,
  key: string
): Promise<{ ids: string[]; error?: string }> {
  const preset = IMAGE_PROVIDERS[providerId]
  if (!preset.modelsUrl) {
    return { ids: [], error: '该 provider 未声明 modelsUrl' }
  }
  const trimmedKey = key.trim()
  if (!trimmedKey) {
    return { ids: [], error: '请先填入 API Key' }
  }

  const format = resolveImageModelsFormat(providerId)
  const ids = new Set<string>()

  try {
    if (format === 'dashscope-native') {
      // 百炼原生：带 capabilities=IG，page_size 直接拉满（200 够了，生图模型不会超过这个数）
      const url = new URL(preset.modelsUrl)
      url.searchParams.set('capabilities', 'IG')
      url.searchParams.set('page_size', '200')
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${trimmedKey}` }
      })
      if (!res.ok) {
        return { ids: [], error: `拉取失败（${res.status} ${res.statusText}）` }
      }
      const body = await res.json()
      for (const id of parseDashscopeNativeModels(body)) ids.add(id)
    } else {
      // OpenAI 兼容：siliconflow / openai / glm
      const res = await fetch(preset.modelsUrl, {
        headers: { Authorization: `Bearer ${trimmedKey}` }
      })
      if (!res.ok) {
        return { ids: [], error: `拉取失败（${res.status} ${res.statusText}）` }
      }
      const body = await res.json()
      for (const id of parseOpenAICompatibleModels(body)) ids.add(id)
    }
  } catch (err) {
    return { ids: [], error: err instanceof Error ? err.message : '网络请求异常' }
  }

  const result = filterRemoteMediaModels([...ids], providerId)
  console.log('result---1', result)
  remoteModelCache.set(providerId, { ids: result, fetchedAt: Date.now() })
  return { ids: result }
}

/**
 * 读取某个 provider 的缓存（不触发网络请求）。
 * 超过 TTL 的视为没缓存。
 */
export function getCachedImageModels(providerId: ImageProviderId): string[] | null {
  const entry = remoteModelCache.get(providerId)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > REMOTE_MODEL_CACHE_TTL_MS) return null
  return entry.ids
}

/**
 * 返回 UI 可直接消费的模型选项列表。
 * 纯远程驱动：缓存里有什么就展示什么，没有就返回空数组。
 * 所有模型元数据（sizes 等）统一给兜底值，不再查本地字典。
 *
 * 为什么本地不再维护 models：
 *   5 家 provider 都有 /v1/models 接口，模型 ID 会随服务商更新，
 *   本地硬编码会过期。远程拉 + 关键词过滤（只保留生图相关）是更可持续的做法。
 */
export function resolveImageModelList(
  providerId: ImageProviderId
): Array<[string, ImageModelPreset]> {
  const preset = IMAGE_PROVIDERS[providerId]
  const remote = getCachedImageModels(providerId)

  if (!remote) return []

  // 把 defaultModel 放到首位（如果远程有它），其余保持 API 返回顺序
  const fallbackPreset: ImageModelPreset = { sizes: FALLBACK_IMAGE_SIZES }
  const merged: Array<[string, ImageModelPreset]> = []
  let defaultAdded = false
  for (const id of remote) {
    if (id === preset.defaultModel) {
      merged.unshift([id, fallbackPreset])
      defaultAdded = true
    } else {
      merged.push([id, fallbackPreset])
    }
  }
  // 如果远程没返回 defaultModel，也把它塞进去给用户一个"默认"选项
  if (!defaultAdded) {
    merged.unshift([preset.defaultModel, fallbackPreset])
  }
  return merged
}

/** 远程模型缓存 TTL（供 UI 层展示 / 测试用） */
export const IMAGE_MODEL_CACHE_TTL_MS = REMOTE_MODEL_CACHE_TTL_MS
