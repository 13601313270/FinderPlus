import { Value, type ValueKind } from './Value'
import { ImgFileValue } from './ImgFileValue'

/** 多模态值里的单个片段：文本 / 图片（未来可扩音频、PDF 等） */
export type MultiModalPart =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'image'; readonly file: File }

/**
 * 多模态传输子：把文字、图片等混合在一个值里。
 *
 * 用途：LLM / Harness 等需要同时接收"文字 prompt + 图片参考"的节点。
 * 不再需要单独的 imageInput 端口，所有输入统一走 promptInput 这个端口。
 *
 * 上游节点（StringInputNode、ImgFileNode 等）可以直接 commit 各自的单模态 Value，
 * HarnessNode 在 resolveInputs 里自动包装成 MultiModalValue，对上游透明。
 */
export class MultiModalValue extends Value {
  static override readonly VALUE_NAME: ValueKind = 'multimodal'

  readonly fingerprint: string

  constructor(readonly parts: MultiModalPart[]) {
    super(parts.length === 0)
    if (parts.length === 0) {
      this.fingerprint = 'multimodal:null'
    } else {
      // 每个 part 的指纹拼起来再算 djb2
      const inner = parts.map(p => {
        if (p.type === 'text') return `text:${p.text}`
        if (p.type === 'image') return `image:${p.file.name}:${p.file.size}:${p.file.type}`
        return `unknown:${(p as { type: string }).type}`
      }).join('|')
      this.fingerprint = `multimodal:${djb2(inner)}`
    }
  }

  override get displayLabel(): string {
    if (this.isNull) return '(null)'
    return this.parts.map(p => {
      if (p.type === 'text') {
        const t = p.text.length > 20 ? p.text.slice(0, 20) + '…' : p.text
        return `"${t}"`
      }
      if (p.type === 'image') return `🖼 ${p.file.name}`
      return `📎 ${(p as { type: string }).type}`
    }).join(' + ')
  }

  /** 方便下游：快速提取纯文本 part 的拼接结果 */
  get textContent(): string {
    return this.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text)
      .join('\n')
  }

  /** 方便下游：快速提取所有图片的 File 对象 */
  get imageFiles(): File[] {
    return this.parts
      .filter((p): p is { type: 'image'; file: File } => p.type === 'image')
      .map(p => p.file)
  }
}

/** djb2 哈希：轻量、冲突率低，适合做内容指纹 */
function djb2(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff
  }
  return hash >>> 0
}

/**
 * 从现有单模态值快速包装成 MultiModalValue：
 * StringValue → 单个 text part
 * ImgFileValue → 单个 image part
 * 其他 FileValue 子类 → 暂时忽略（未来扩）
 */
export function wrapAsMultiModal(v: unknown): MultiModalValue {
  if (v instanceof MultiModalValue) return v
  if (v instanceof StringValue) {
    return new MultiModalValue(v.isNull ? [] : [{ type: 'text', text: v.value! }])
  }
  if (v instanceof ImgFileValue && !v.isNull && v.file) {
    return new MultiModalValue([{ type: 'image', file: v.file }])
  }
  return new MultiModalValue([])
}

// 这里必须 import 一下，不然 wrapAsMultiModal 里 instanceof StringValue 会报未声明
import { StringValue } from './StringValue'
