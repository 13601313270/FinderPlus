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

export type ImageProviderId = 'siliconflow' | 'openai' | 'glm' | 'dashscope'

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
   * 当前覆盖：百炼 sync 的 qwen-image-2.0-pro（上限 3）、wan2.6-t2i（上限 4）。
   * 端口会据此做数量校验，超上限直接报错而不是静默截断。
   */
  readonly maxReferenceImages?: number
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
  readonly models: Readonly<Record<string, ImageModelPreset>>
  readonly defaultModel: string
}

export const IMAGE_PROVIDERS: Readonly<Record<ImageProviderId, ImageProviderPreset>> = {
  siliconflow: {
    label: '硅基流动 (SiliconFlow)',
    url: 'https://api.siliconflow.cn/v1/images/generations',
    shape: 'siliconflow',
    defaultModel: 'Kwai-Kolors/Kolors',
    models: {
      'Kwai-Kolors/Kolors': {
        sizes: ['1024x1024', '960x1280', '768x1024', '720x1440', '720x1280']
      },
      'black-forest-labs/FLUX.1-schnell': {
        sizes: ['1024x1024', '1024x1536', '1536x1024', '768x1344']
      },
      'Qwen/Qwen-Image': {
        sizes: ['1024x1024', '1328x1328', '1664x928', '928x1664', '1584x1056', '1056x1584']
      }
    }
  },
  openai: {
    label: 'OpenAI (DALL·E / GPT-Image)',
    url: 'https://api.openai.com/v1/images/generations',
    shape: 'openai',
    defaultModel: 'dall-e-3',
    models: {
      'dall-e-3': {
        sizes: ['1024x1024', '1792x1024', '1024x1792'],
        supportsBase64Response: true
      },
      'dall-e-2': {
        sizes: ['256x256', '512x512', '1024x1024'],
        supportsBase64Response: true
      },
      'gpt-image-1': {
        sizes: ['1024x1024', '1536x1024', '1024x1536', 'auto']
      }
    }
  },
  glm: {
    label: '智谱 (CogView)',
    url: 'https://open.bigmodel.cn/api/paas/v4/images/generations',
    shape: 'zhipu',
    defaultModel: 'cogview-3-flash',
    models: {
      'cogview-3-flash': {
        sizes: ['1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440']
      },
      'cogview-4': {
        sizes: ['1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440']
      }
    }
  },
  dashscope: {
    // 通义千问（Qwen-Image）与通义万相（Wan）共用同一个百炼 API Key，所以合成一个 provider
    label: '阿里云百炼 (通义千问 / 万相)',
    url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    asyncUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
    taskUrlPrefix: 'https://dashscope.aliyuncs.com/api/v1/tasks/',
    shape: 'dashscope-sync',
    defaultModel: 'qwen-image-2.0-pro',
    models: {
      // —— 同步（multimodal-generation，messages 协议）——
      // 2.0-pro 文档默认 2048*2048，这里把 1024x1024 放首位当默认值，省额度，且仍在 512*512~2048*2048 的合法区间
      'qwen-image-2.0-pro': {
        sizes: ['1024x1024', '1328x1328', '1536x1024', '1024x1536', '1664x928', '928x1664', '2048x2048'],
        maxReferenceImages: 4
      },
      'qwen-image': {
        sizes: ['1024x1024', '1664x928', '1472x1140', '1328x1328', '1140x1472', '928x1664']
      },
      'qwen-image-max': {
        sizes: ['1024x1024', '1664x928', '1472x1140', '1328x1328', '1140x1472', '928x1664']
      },
      // 万相 2.6 走的是同一套同步接口；尺寸按官方说明取 1280*1280~1440*1440 像素区间内的常用档
      'wan2.6-t2i': {
        sizes: ['1280x1280', '1440x1440', '1600x1280', '1280x1600'],
        maxReferenceImages: 4
      },
      // —— 异步（提交任务 + 轮询）——
      'wan2.5-t2i-preview': {
        shape: 'dashscope-async',
        sizes: ['1280x1280', '1440x1440', '1600x1280', '1280x1600']
      },
      'wanx2.1-t2i-turbo': {
        shape: 'dashscope-async',
        sizes: ['1024x1024', '720x1280', '1280x720', '768x1344', '1344x768']
      }
    }
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
  // provider 不认时回落默认
  const preset = IMAGE_PROVIDERS[providerId] ?? IMAGE_PROVIDERS.siliconflow
  const key = readImageProviderKey(providerId)
  const model = (modelOverride?.trim() && preset.models[modelOverride.trim()])
    ? modelOverride.trim()
    : preset.defaultModel
  const modelPreset = preset.models[model]
  const sizes = modelPreset?.sizes ?? FALLBACK_IMAGE_SIZES
  // 模型级协议优先（同一家下同步 / 异步混用，如百炼的 qwen-image 与万相 2.5）
  const shape = modelPreset?.shape ?? preset.shape
  const isAsyncTask = shape === 'dashscope-async'

  return {
    provider: providerId,
    label: preset.label,
    requestUrl: isAsyncTask ? preset.asyncUrl ?? preset.url : preset.url,
    taskUrlPrefix: isAsyncTask ? preset.taskUrlPrefix ?? '' : '',
    shape,
    key,
    model,
    sizes,
    defaultSize: sizes[0],
    supportsBase64Response: modelPreset?.supportsBase64Response ?? false,
    maxReferenceImages: modelPreset?.maxReferenceImages ?? 0
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
      // 同步协议（qwen-image 系列、万相 2.6）：messages 结构 + prompt_extend / watermark
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
      return {
        model: endpoint.model,
        input: { messages: [{ role: 'user', content }] },
        parameters: {
          size: toDashscopeSize(size),
          n: 1,
          prompt_extend: true,
          watermark: false
        }
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
