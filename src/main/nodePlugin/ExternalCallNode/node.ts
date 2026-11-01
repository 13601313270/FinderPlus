import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { BoolValue } from '../../engine/data/BoolValue'
import { FileValue } from '../../engine/data/FileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { JsonValue } from '../../engine/data/JsonValue'
import type { Value } from '../../engine/data/Value'

/** 端口可选类型 */
export type ExternalCallPortKind = 'number' | 'string' | 'bool' | 'file' | 'json'

/** 端口名校验失败的原因 */
export type ExternalCallPortNameError =
  | { readonly kind: 'empty' }
  | { readonly kind: 'invalid-ident' }
  | { readonly kind: 'duplicate-input'; readonly name: string }

/** 所有合法的端口 kind */
const ALL_KINDS: readonly ExternalCallPortKind[] = ['number', 'string', 'bool', 'file', 'json'] as const

/** InputPort.accepts 映射 */
const KIND_ACCEPTS: Record<ExternalCallPortKind, NonNullable<ConstructorParameters<typeof InputPort>[1]['accepts']>[number][]> = {
  number: [NumberValue],
  string: [StringValue],
  bool: [BoolValue],
  file: [FileValue],
  json: [JsonValue]
}

/** OutputPort valueClass 映射 */
const KIND_OUTPUT_CLASS: Record<ExternalCallPortKind, ConstructorParameters<typeof OutputPort>[1]> = {
  number: NumberValue,
  string: StringValue,
  bool: BoolValue,
  file: FileValue,
  json: JsonValue
}

/** 端口元数据：输入端口和输出端口共用同一份元数据——永远对齐 */
export interface ExternalCallPortMeta {
  /** 端口唯一 id（持久化）。输入端口用这个 id，输出端口也用这个 id（引擎层互不冲突） */
  id: string
  /** 端口名（输入输出共用，外部调用时按此名称传参） */
  name: string
  /** 类型：决定输入 accepts 和输出 valueClass */
  kind: ExternalCallPortKind
}

/** box 固定宽度 */
const NODE_WIDTH = 240

/** 折叠时的最小高度 */
const COLLAPSED_BASE_HEIGHT = 120

/** 每个端口约占 24px 的高度（输入+输出对齐后，每行一个端口占一次高度） */
const PER_PORT_HEIGHT = 24

/** box 高度计算 */
function computeBoxHeight(portCount: number): number {
  const portsHeight = portCount * PER_PORT_HEIGHT + 16
  return Math.max(COLLAPSED_BASE_HEIGHT, portsHeight)
}

/**
 * 外部调用节点：可以被其他设备通过通信触发执行。
 *
 * 输入端口和输出端口永远 1:1 对齐——增删改操作同时作用于输入和输出。
 * 用户只配置一份元数据（端口名 + 类型），引擎层自动构建 InputPort 和 OutputPort。
 *
 * 外部调用触发后，数据按配置的端口类型和名称注入：
 * - commit 到对应 InputPort（供其他节点连边写入）
 * - commit 到对应 OutputPort（推送给下游节点）
 *
 * 通信触发逻辑暂未实现，留接口供后续接入。
 */
export class ExternalCallNode extends Node {
  static readonly TYPE = 'external-call'
  readonly type = ExternalCallNode.TYPE

  /** 端口元数据（持久化）。输入输出永远从这里派生 */
  private portMetas: ExternalCallPortMeta[] = []
  /** 运行时输入端口列表：与 portMetas 一一对应 */
  private myInputPorts: InputPort[] = []
  /** 运行时输出端口列表：与 portMetas 一一对应 */
  private myOutputPorts: OutputPort[] = []

  /** 方法端口：手动触发外部调用（测试用） */
  private readonly triggerPort = new MethodPort('trigger', {
    label: { zh: '触发', en: 'Trigger' }
  })

  /** 上次触发时间戳（派生，不持久化） */
  private lastTriggerAt = 0

  constructor(id: string) {
    super(id)
    // 默认给一个端口，方便第一次使用
    this.addDefaultPort()
    // 注册方法端口 + 绑定触发回调
    super.addMethod(this.triggerPort)
    this.triggerPort.onTrigger(() => { void this.handleManualTrigger() })
    // box 高度
    this.setBox(NODE_WIDTH, computeBoxHeight(1))
  }

  /** 构造时添加默认端口 input1（number 类型），同时创建输入和输出端口 */
  private addDefaultPort(): void {
    const meta: ExternalCallPortMeta = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: 'input1',
      kind: 'number'
    }
    this.portMetas.push(meta)
    const inPort = this.buildInputPort(meta)
    const outPort = this.buildOutputPort(meta)
    this.myInputPorts.push(inPort)
    this.myOutputPorts.push(outPort)
    super.addInput(inPort)
    super.addOutput(outPort)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件 */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件
  }

  // —— 渲染层读的状态 ——

  /** 渲染层读当前端口元数据列表（输入输出共用） */
  get displayPorts(): readonly ExternalCallPortMeta[] {
    return this.portMetas
  }

  /** 渲染层读上次触发时间戳 */
  get displayLastTriggerAt(): number {
    return this.lastTriggerAt
  }

  /** 内部：端口增删后 box 高度跟着更新 */
  private updateBoxHeight(): void {
    this.setBox(NODE_WIDTH, computeBoxHeight(this.portMetas.length))
  }

  // —— 静态工具：端口名校验 ——

  private static IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

  /** 校验端口名是否合法且未重复 */
  validatePortName(name: string, excludeId?: string): ExternalCallPortNameError | null {
    const trimmed = name.trim()
    if (!trimmed) return { kind: 'empty' }
    if (!ExternalCallNode.IDENT_RE.test(trimmed)) {
      return { kind: 'invalid-ident' }
    }
    const dup = this.portMetas.find(m => m.name === trimmed && m.id !== excludeId)
    if (dup) return { kind: 'duplicate-input', name: trimmed }
    return null
  }

  // —— 端口管理（输入输出对齐） ——

  /** 追加一个端口（同时创建输入+输出），默认类型 number、默认端口名不冲突 */
  addPort(): ExternalCallPortMeta {
    let seq = this.portMetas.length + 1
    let name = `input${seq}`
    while (this.portMetas.some(m => m.name === name)) {
      seq += 1
      name = `input${seq}`
    }
    const meta: ExternalCallPortMeta = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      kind: 'number'
    }
    this.portMetas.push(meta)
    const inPort = this.buildInputPort(meta)
    const outPort = this.buildOutputPort(meta)
    this.myInputPorts.push(inPort)
    this.myOutputPorts.push(outPort)
    super.addInput(inPort)
    super.addOutput(outPort)
    this.updateBoxHeight()
    this.notifyChanged()
    return meta
  }

  /** 删除一个端口（同时删除输入+输出）及其连线 */
  removePortById(id: string): void {
    const idx = this.portMetas.findIndex(m => m.id === id)
    if (idx === -1) return
    this.portMetas.splice(idx, 1)
    const inPort = this.myInputPorts.splice(idx, 1)[0]
    const outPort = this.myOutputPorts.splice(idx, 1)[0]
    if (inPort) super.removeInput(inPort)
    if (outPort) super.removeOutput(outPort)
    this.updateBoxHeight()
    this.notifyChanged()
  }

  /** 修改某个端口的名称；校验不通过就跳过（同时更新输入+输出的 label） */
  setPortName(id: string, newName: string): void {
    const err = this.validatePortName(newName, id)
    if (err) return
    const meta = this.portMetas.find(m => m.id === id)
    if (!meta) return
    const trimmed = newName.trim()
    if (meta.name === trimmed) return
    meta.name = trimmed
    const inPort = this.myInputPorts.find(p => p.id === id)
    const outPort = this.myOutputPorts.find(p => p.id === id)
    inPort?.setLabel({ zh: trimmed, en: trimmed })
    outPort?.setLabel({ zh: trimmed, en: trimmed })
    this.notifyChanged()
  }

  /** 修改某个端口的类型——全量重建输入+输出端口（accepts/valueClass 变了旧端口不再合法） */
  setPortKind(id: string, kind: ExternalCallPortKind): void {
    const meta = this.portMetas.find(m => m.id === id)
    if (!meta || meta.kind === kind) return
    meta.kind = kind
    this.rebuildAllPorts()
    this.notifyChanged()
  }

  /** 根据 meta 构造一个新的 InputPort */
  private buildInputPort(meta: ExternalCallPortMeta): InputPort {
    return new InputPort(meta.id, {
      accepts: KIND_ACCEPTS[meta.kind],
      label: { zh: meta.name, en: meta.name }
    })
  }

  /** 根据 meta 构造一个新的 OutputPort */
  private buildOutputPort(meta: ExternalCallPortMeta): OutputPort {
    return new OutputPort(meta.id, KIND_OUTPUT_CLASS[meta.kind], { zh: meta.name, en: meta.name })
  }

  /** 全量重建所有端口：删掉所有旧的输入输出、按 portMetas 重新 build 并 addInput/addOutput。先删后加 */
  private rebuildAllPorts(): void {
    const oldIns = [...this.myInputPorts]
    const oldOuts = [...this.myOutputPorts]
    for (const p of oldIns) {
      super.removeInput(p)
    }
    for (const p of oldOuts) {
      super.removeOutput(p)
    }
    this.myInputPorts = this.portMetas.map(m => this.buildInputPort(m))
    this.myOutputPorts = this.portMetas.map(m => this.buildOutputPort(m))
    for (const p of this.myInputPorts) {
      super.addInput(p)
    }
    for (const p of this.myOutputPorts) {
      super.addOutput(p)
    }
  }

  // —— 输入端口变化回调 ——

  /** 输入端口值变化 → 通知渲染层刷新。ExternalCallNode 不做计算，只等待外部触发 */
  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    this.notifyChanged()
  }

  // —— 触发执行 ——

  /**
   * 手动触发（MethodPort 或后续通信触发入口）。
   *
   * 注：当前实现仅记录触发时间，暂不处理数据注入逻辑。
   * 后续接入通信模块后，将从通信 payload 中提取端口名→值的映射，
   * 对应包装后 commit 到各 OutputPort，推送给下游。
   */
  private async handleManualTrigger(): Promise<void> {
    this.lastTriggerAt = Date.now()
    this.notifyChanged()
    // TODO: 接入通信模块后实现数据注入逻辑
  }

  /**
   * 外部通信触发入口。
   *
   * @param payload 通信请求体，包含端口名 → 原始值 的映射
   *
   * 实现逻辑：
   *   1. 遍历 portMetas，从 payload 中按 name 提取值
   *   2. 按 kind 将原始值包装成对应的 Value 子类
   *   3. commit 到对应 OutputPort，推送给下游
   *
   * 示例 payload:
   *   { "input1": 42, "input2": "hello", "input3": true }
   */
  handleExternalCall(payload: Record<string, unknown>): void {
    for (let i = 0; i < this.portMetas.length; i++) {
      const meta = this.portMetas[i]!
      const raw = payload[meta.name]
      if (raw === undefined) continue
      const outPort = this.myOutputPorts[i]
      if (!outPort) continue
      try {
        const v = this.coerceValue(raw, meta.kind)
        outPort.commit(v, { force: true })
      } catch {
        // 某个端口值转换失败不影响其他端口
      }
    }
    this.lastTriggerAt = Date.now()
    this.notifyChanged()
  }

  /** 把原始值按 kind 包装成对应的 Value 子类 */
  private coerceValue(raw: unknown, kind: ExternalCallPortKind): Value {
    switch (kind) {
      case 'number': {
        const n = Number(raw)
        if (!Number.isFinite(n)) throw new Error(`无法转为数字：${String(raw)}`)
        return new NumberValue(n)
      }
      case 'bool':
        return new BoolValue(Boolean(raw))
      case 'json':
        return new JsonValue(typeof raw === 'string' ? JSON.parse(raw) : raw)
      case 'file':
        throw new Error('file 类型暂不支持外部调用注入')
      case 'string':
      default:
        return new StringValue(String(raw))
    }
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      ...super.saveState(),
      ports: this.portMetas
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    // —— 清理旧端口 ——
    for (const p of this.myInputPorts) {
      super.removeInput(p)
    }
    for (const p of this.myOutputPorts) {
      super.removeOutput(p)
    }
    this.myInputPorts = []
    this.myOutputPorts = []
    this.portMetas = []

    // —— 恢复端口元数据，同时构建输入+输出端口 ——
    const savedPorts = state.ports
    if (Array.isArray(savedPorts)) {
      for (const entry of savedPorts) {
        const obj = entry as Record<string, unknown>
        if (
          typeof obj.id === 'string' &&
          typeof obj.name === 'string' &&
          typeof obj.kind === 'string' &&
          ALL_KINDS.includes(obj.kind as ExternalCallPortKind)
        ) {
          const meta: ExternalCallPortMeta = {
            id: obj.id,
            name: obj.name,
            kind: obj.kind as ExternalCallPortKind
          }
          this.portMetas.push(meta)
          const inPort = this.buildInputPort(meta)
          const outPort = this.buildOutputPort(meta)
          this.myInputPorts.push(inPort)
          this.myOutputPorts.push(outPort)
          super.addInput(inPort)
          super.addOutput(outPort)
        }
      }
    }

    // —— 兼容旧数据：如果没有任何端口，补一个默认的 ——
    if (this.portMetas.length === 0) {
      this.addDefaultPort()
    }

    // —— 最后：端口都恢复完了，根据端口数量设 box 高度 ——
    this.setBox(NODE_WIDTH, computeBoxHeight(this.portMetas.length))

    this.notifyChanged()
  }
}
