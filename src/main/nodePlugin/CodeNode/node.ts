import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { BoolValue } from '../../engine/data/BoolValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'
import type { Value } from '../../engine/data/Value'

/** 可选的返回类型：决定输出端口挂哪种 Value，也决定结果怎么包装 */
export type CodeReturnKind = 'number' | 'string' | 'bool'

/** 返回类型 → Value 子类（端口类型与结果包装共用这一处真相） */
const KIND_CLASSES = {
  number: NumberValue,
  string: StringValue,
  bool: BoolValue
} as const

/** 执行状态：UI 据此决定按钮可点 / 结果区样式 */
export type CodeStatus = 'idle' | 'running' | 'done' | 'error'

const NODE_HEIGHT = 320

/**
 * 代码节点：把一段 JS 函数体存在节点里，点「执行」跑一次，结果按选定的返回类型发往下游。
 *
 * - 代码只写函数体，自己用 return 返回结果；执行在主进程（渲染进程 CSP 禁 eval），
 *   经 preload 的 codeApi 转发，节点保持对 Electron 透明（同 CommandNode 的处理方式）。
 * - 返回类型（number / string / bool）由用户选，切类型就重建输出端口：旧端口连同下游边
 *   一起断掉，新端口挂对应的 Value 子类。
 */
export class CodeNode extends Node {
  static readonly TYPE = 'code'
  readonly type = CodeNode.TYPE

  /** 当前返回类型（持久化） */
  private returnKindValue: CodeReturnKind = 'number'

  /** 函数体（持久化） */
  private code = ''

  /** 输出端口：随 returnKindValue 动态重建 */
  private resultOutput: OutputPort | undefined

  /** 上次执行的原始返回值（派生，不持久化）；切类型时用它把新端口的值补上 */
  private lastRawValue: number | string | boolean | undefined

  /** 上次结果的展示文本 / 错误文本（派生，不持久化） */
  private resultText = ''
  private errorText = ''
  private status: CodeStatus = 'idle'

  constructor(id: string) {
    super(id)
    // 按默认返回类型先挂上输出端口
    this.rebuildOutputPort()
    // 内容区硬约束：手柄 + 代码编辑区 + 类型行 + 结果区 + 执行按钮
    this.setBox(360, NODE_HEIGHT)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  // —— 渲染层读的状态 ——

  get displayCode(): string {
    return this.code
  }

  get returnKind(): CodeReturnKind {
    return this.returnKindValue
  }

  get displayResult(): string {
    return this.resultText
  }

  get displayError(): string {
    return this.errorText
  }

  get displayStatus(): CodeStatus {
    return this.status
  }

  // —— 用户操作 ——

  /** 保存函数体；编辑区 input 时调用（不触发执行） */
  setCode(text: string): void {
    if (text === this.code) return
    this.code = text
    this.notifyChanged()
  }

  /** 切换返回类型：重建输出端口挂上对应的 Value 子类 */
  setReturnKind(kind: CodeReturnKind): void {
    if (kind === this.returnKindValue) return
    this.returnKindValue = kind
    this.rebuildOutputPort()
    this.notifyChanged()
  }

  /**
   * 执行当前代码；UI 的「执行」按钮点击时调用。
   * 结果按当前返回类型包装成 Value 提交到输出端口，失败则记录错误文本。
   */
  async run(): Promise<void> {
    const body = this.code.trim()
    if (!body) return
    // 上一次还没跑完就不重复触发（按钮此时也是禁用的，双保险）
    if (this.status === 'running') return

    this.status = 'running'
    this.errorText = ''
    this.notifyChanged()

    let resp: { ok: boolean; value?: number | string | boolean; error?: string }
    try {
      // @ts-ignore — tsconfig.node.json 编译本文件时不把 preload 的 Window 扩展带进来，
      // 但运行时本文件只在 renderer 里执行，window.codeApi 一定存在
      resp = await window.codeApi.run(this.code)
    } catch (err) {
      resp = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }

    if (!resp.ok) {
      this.resultText = ''
      this.errorText = resp.error ?? '执行失败'
      this.status = 'error'
      this.notifyChanged()
      return
    }

    try {
      const value = this.coerce(resp.value as number | string | boolean)
      this.resultOutput?.commit(value)
      this.lastRawValue = resp.value
      this.resultText = value.displayLabel
      this.errorText = ''
      this.status = 'done'
    } catch (err) {
      this.resultText = ''
      this.errorText = err instanceof Error ? err.message : String(err)
      this.status = 'error'
    }
    this.notifyChanged()
  }

  /** 没有输入端口，永远收不到通知 */
  inputPortReceiveValue(_ports: InputPort[]): void {}

  // —— 内部：端口重建 & 结果包装 ——

  /** 保证输出端口的 valueClass 与当前返回类型一致；不一致就拆旧建新 */
  private rebuildOutputPort(): void {
    const valueClass = KIND_CLASSES[this.returnKindValue]
    if (this.resultOutput && this.resultOutput.valueClass === valueClass) return

    if (this.resultOutput) {
      // removeOutput 会连同下游边一起断掉（有 Scene 时）
      this.removeOutput(this.resultOutput)
    }
    this.resultOutput = new OutputPort('result', valueClass, '结果')
    this.addOutput(this.resultOutput)

    // 把上次的原始返回值按新类型补一次，让端口持有 currentValue——
    // 这样之后新连下游时，EdgeBinder.connect 会把已有值立刻补给对方。
    if (this.lastRawValue !== undefined) {
      try {
        this.resultOutput.commit(this.coerce(this.lastRawValue))
      } catch {
        // 旧值不适合新类型（如 "abc" 切到 number）→ 忽略，端口留空
      }
    }
  }

  /** 把主进程回传的原始返回值按当前返回类型包装成 Value；数字非法则抛错 */
  private coerce(raw: number | string | boolean): Value {
    switch (this.returnKindValue) {
      case 'number': {
        const n = Number(raw)
        if (!Number.isFinite(n)) {
          throw new Error(`返回值无法转为数字：${String(raw)}`)
        }
        return new NumberValue(n)
      }
      case 'bool':
        return new BoolValue(Boolean(raw))
      case 'string':
      default:
        return new StringValue(String(raw))
    }
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return { code: this.code, returnKind: this.returnKindValue }
  }

  readState(state: Record<string, unknown>): void {
    if (typeof state.code === 'string') {
      this.code = state.code
    }
    const kind = state.returnKind
    if (kind === 'number' || kind === 'string' || kind === 'bool') {
      this.returnKindValue = kind
    }
    // 按恢复后的类型对齐输出端口
    this.rebuildOutputPort()
    this.notifyChanged()
  }
}