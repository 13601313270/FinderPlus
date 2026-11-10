import { BoolValue } from '../../engine/data/BoolValue'
import { FileValue } from '../../engine/data/FileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import type { InputPortChangeSource } from '../../engine/node/Node'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** ProxyNode 可选的数据类型（与 BufferNode 完全一致） */
export type Kind = 'number' | 'string' | 'bool' | 'file' | 'imgfile' | 'json'

/** kind → Value 子类（端口构建时用） */
const KIND_CLASSES = {
  number: NumberValue,
  string: StringValue,
  bool: BoolValue,
  file: FileValue,
  imgfile: ImgFileValue,
  json: JsonValue
} as const

/** 所有合法 kind，readState 反序列化校验用 */
const ALL_KINDS: readonly Kind[] = ['number', 'string', 'bool', 'file', 'imgfile', 'json']

/** 默认新建端口的类型 */
const DEFAULT_KIND: Kind = 'number'

const NODE_WIDTH = 500
const BASE_HEIGHT = 60
const PER_PORT_HEIGHT = 34

/** 端口最小数量 */
const MIN_PORT_COUNT = 1

/**
 * 汇流（Proxy）节点：多入 + 多出，逐值即时透传，每个端口独立类型。
 *
 * - 每个输入端口独立选择类型，配对一个同类型的 call 端口（in_i ↔ call_i）。
 * - 每个输出端口独立选择类型，配对一个同类型的 callback 端口（out_j ↔ callback_j）。
 * - 某个输入端口收到新值 → 立即 force=true commit 到配对的 call 端口。
 * - 某个 callback 端口收到新值 → 立即 force=true commit 到配对的输出端口。
 *
 * 切换端口类型是破坏性操作：旧端口被移除时自动断边（同 BufferNode），
 * 运行时连线不会自动恢复，需用户重新连接。
 */
export class ProxyNode extends Node {
  static readonly TYPE = 'proxy'
  readonly type = ProxyNode.TYPE

  /** 每个输入端口的类型，下标与 inputPorts 一一对应 */
  private inputKinds: Kind[]

  /** 每个输出端口的类型，下标与 outputPorts 一一对应 */
  private outputKinds: Kind[]

  /** 已收养的子节点列表（容器能力，复用 FolderNode 语义） */
  readonly children: Node[] = []

  /** 恢复收尾前暂存的待收养子节点 id */
  private pendingChildIds: string[] = []

  constructor(id: string, initialInputCount = MIN_PORT_COUNT, initialOutputCount = MIN_PORT_COUNT) {
    super(id)
    const inputCount = Math.max(MIN_PORT_COUNT, initialInputCount)
    const outputCount = Math.max(MIN_PORT_COUNT, initialOutputCount)
    this.inputKinds = new Array(inputCount).fill(DEFAULT_KIND)
    this.outputKinds = new Array(outputCount).fill(DEFAULT_KIND)
    for (let i = 0; i < inputCount; i++) {
      this.addInputPort(i)
    }
    for (let i = 0; i < outputCount; i++) {
      this.addOutputPort(i)
    }
    this.updateBox()
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return true
  }

  async onFileDrop(sourcePath: string): Promise<void> {
    // 复用 FolderNode 的扩展名注册表 → 构造对应文件节点 → 收养
    const { resolveByExtension } = await import('../index')
    const dot = sourcePath.lastIndexOf('.')
    const ext = dot >= 0 ? sourcePath.slice(dot).toLowerCase() : ''
    const manifest = resolveByExtension(ext)
    if (!manifest) return

    // 让 App 层正常处理文件复制后构造（ProxyNode 自己不碰 IPC）
    // 这里只做收养入口：App 会在它的 onCanvasDrop 里构造子节点后调 adoptNode
  }

  // —— 容器：子节点收养 / 释放 ——

  /** 把已有节点收养进 ProxyNode。position 由调用方保证已是局部坐标，本方法不做转换 */
  adoptNode(child: Node): void {
    if (child === this) return
    if (child.containerNode) return // 已被收养（含被本 ProxyNode 收养过）
    if (this.isDescendant(child)) return // 把祖先收养进自己 = 成环，拒绝

    child.containerNode = this
    this.children.push(child)
    this.sceneRef?.notifyChanged()
    this.notifyChanged()
  }

  /** 释放子节点回画布：补世界坐标清归属，原地保留 */
  removeChild(child: Node): void {
    const idx = this.children.indexOf(child)
    if (idx < 0) return
    this.children.splice(idx, 1)
    const [wx, wy] = this.worldPosition
    const [lx, ly] = child.position
    child.setPosition(wx + lx, wy + ly)
    child.containerNode = undefined
    this.sceneRef?.notifyChanged()
    this.notifyChanged()
  }

  /** 恢复收尾：按 pendingChildIds 收养 */
  adoptAllChildren(): void {
    const scene = this.sceneRef
    if (!scene) {
      // scene 还没注入，只能暂存（理论上 App 层 bootstrapScene 调这个时 scene 已就绪）
      return
    }
    for (const id of this.pendingChildIds) {
      const child = scene.getNode(id)
      if (child && child !== this) this.adoptNode(child)
    }
    this.pendingChildIds = []
  }

  /** child 是否在我的祖先链里（收养它会成环） */
  private isDescendant(child: Node): boolean {
    let cur: Node | undefined = this.containerNode
    while (cur) {
      if (cur === child) return true
      cur = cur.containerNode
    }
    return false
  }

  /** 接受所有未被收养、且不会成环的节点 */
  isPositionAcceptNodeDrop(source: Node): boolean {
    if (source.containerNode) return false
    if (this.isDescendant(source)) return false
    return true
  }

  /** 节点 drop 结算：世界坐标 → 局部坐标，保持落点 */
  onNodeDrop(source: Node, _startPos: readonly [number, number]): boolean {
    if (!this.isPositionAcceptNodeDrop(source)) return false
    const [swx, swy] = source.worldPosition
    const [fwx, fwy] = this.worldPosition
    source.setPosition(swx - fwx, swy - fwy)
    this.adoptNode(source)
    return true
  }

  /** 钳制最小框：ProxyNode 作为容器需要足够大才能放子节点 */
  override setBox(width: number, height: number): void {
    const MIN_W = 120
    const MIN_H = 100
    super.setBox(Math.max(MIN_W, Math.round(width)), Math.max(MIN_H, Math.round(height)))
  }

  // —— 渲染层读的状态 ——

  /** 所有输入端口的类型数组（readonly 暴露） */
  get displayInputKinds(): readonly Kind[] {
    return this.inputKinds
  }

  /** 所有输出端口的类型数组（readonly 暴露） */
  get displayOutputKinds(): readonly Kind[] {
    return this.outputKinds
  }

  /** 当前输入端口数量 */
  get displayInputPortCount(): number {
    return this.inputKinds.length
  }

  /** 当前输出端口数量 */
  get displayOutputPortCount(): number {
    return this.outputKinds.length
  }

  // —— 用户操作：单个端口切类型 ——

  /** 切换第 index 个输入端口的类型。破坏性：断旧连线，重建端口 */
  setInputPortKind(index: number, kind: Kind): void {
    if (index < 0 || index >= this.inputKinds.length) return
    if (kind === this.inputKinds[index]) return
    this.inputKinds[index] = kind
    this.rebuildAllPorts()
    this.notifyChanged()
  }

  /** 切换第 index 个输出端口的类型。破坏性：断旧连线，重建端口 */
  setOutputPortKind(index: number, kind: Kind): void {
    if (index < 0 || index >= this.outputKinds.length) return
    if (kind === this.outputKinds[index]) return
    this.outputKinds[index] = kind
    this.rebuildAllPorts()
    this.notifyChanged()
  }

  // —— 用户操作：增删端口 ——

  /** 在末尾追加一个输入端口（默认类型 number） */
  addInputPortAtEnd(): void {
    this.inputKinds.push(DEFAULT_KIND)
    this.addInputPort(this.inputKinds.length - 1)
    this.updateBox()
    this.notifyChanged()
  }

  /** 移除末尾一个输入端口 */
  removeInputPortAtEnd(): void {
    if (this.inputKinds.length <= MIN_PORT_COUNT) return
    const lastIndex = this.inputKinds.length - 1
    const inputPort = this.inputPorts[lastIndex]
    const callPort = this.callPorts[lastIndex]
    if (inputPort) this.removeInput(inputPort)
    if (callPort) this.removeCall(callPort)
    this.inputKinds.pop()
    this.updateBox()
    this.notifyChanged()
  }

  /** 在末尾追加一个输出端口（默认类型 number） */
  addOutputPortAtEnd(): void {
    this.outputKinds.push(DEFAULT_KIND)
    this.addOutputPort(this.outputKinds.length - 1)
    this.updateBox()
    this.notifyChanged()
  }

  /** 移除末尾一个输出端口 */
  removeOutputPortAtEnd(): void {
    if (this.outputKinds.length <= MIN_PORT_COUNT) return
    const lastIndex = this.outputKinds.length - 1
    const outputPort = this.outputPorts[lastIndex]
    const callbackPort = this.callbackPorts[lastIndex]
    if (outputPort) this.removeOutput(outputPort)
    if (callbackPort) this.removeCallback(callbackPort)
    this.outputKinds.pop()
    this.updateBox()
    this.notifyChanged()
  }

  // —— 端口值透传 ——

  /** 跳过脏标记——Proxy 是透传节点，输入变 = 立即透传，没有"脏"这个中间态 */
  _onInputPortChanged(ports: InputPort[], source: InputPortChangeSource): void {
    this.inputPortReceiveValue(ports, source)
  }

  inputPortReceiveValue(ports: InputPort[], _source: InputPortChangeSource): void {
    for (const port of ports) {
      const [value] = port.value
      if (value === undefined) continue

      // 输入端口 → 配对的 call 端口
      const inputIdx = this.inputPorts.indexOf(port)
      if (inputIdx !== -1) {
        const callPort = this.callPorts[inputIdx]
        if (callPort) callPort.commit(value, { force: true })
        continue
      }

      // callback 端口 → 配对的输出端口
      const callbackIdx = this.callbackPorts.indexOf(port)
      if (callbackIdx !== -1) {
        const outputPort = this.outputPorts[callbackIdx]
        if (outputPort) outputPort.commit(value, { force: true })
      }
    }
    this.notifyChanged()
  }

  // —— 端口构建 ——

  /**
   * 构建并登记第 index 个输入端口 + 配对的 call 端口。
   * id 由 index 决定（in_0, call_0, in_1, call_1, ...）。
   */
  private addInputPort(index: number): void {
    const kind = this.inputKinds[index] ?? DEFAULT_KIND
    const inputPort = new InputPort(`in_${index}`, {
      accepts: [KIND_CLASSES[kind]],
      label: { zh: `入 ${index + 1}`, en: `In ${index + 1}` }
    })
    this.addInput(inputPort)

    const callPort = new OutputPort(`call_${index}`, KIND_CLASSES[kind], { zh: `调用 ${index + 1}`, en: `Call ${index + 1}` })
    this.addCall(callPort)
  }

  /**
   * 构建并登记第 index 个输出端口 + 配对的 callback 端口。
   * id 由 index 决定（out_0, callback_0, out_1, callback_1, ...）。
   */
  private addOutputPort(index: number): void {
    const kind = this.outputKinds[index] ?? DEFAULT_KIND
    const outputPort = new OutputPort(`out_${index}`, KIND_CLASSES[kind], { zh: `出 ${index + 1}`, en: `Out ${index + 1}` })
    this.addOutput(outputPort)

    const callbackPort = new InputPort(`callback_${index}`, {
      accepts: [KIND_CLASSES[kind]],
      label: { zh: `回调 ${index + 1}`, en: `Callback ${index + 1}` }
    })
    this.addCallback(callbackPort)
  }

  /** 按当前 inputKinds / outputKinds 全量重建端口（断开旧边、保持 id 连续） */
  private rebuildAllPorts(): void {
    // 输入 + call
    for (const p of [...this.inputPorts]) this.removeInput(p)
    for (const p of [...this.callPorts]) this.removeCall(p)
    for (let i = 0; i < this.inputKinds.length; i++) {
      this.addInputPort(i)
    }

    // 输出 + callback
    for (const p of [...this.outputPorts]) this.removeOutput(p)
    for (const p of [...this.callbackPorts]) this.removeCallback(p)
    for (let i = 0; i < this.outputKinds.length; i++) {
      this.addOutputPort(i)
    }
  }

  /** 按当前端口数量更新内容区高度 */
  private updateBox(): void {
    const maxCount = Math.max(this.inputKinds.length, this.outputKinds.length)
    this.setBox(NODE_WIDTH, BASE_HEIGHT + maxCount * PER_PORT_HEIGHT)
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return {
      ...super.saveState(),
      inputKinds: [...this.inputKinds],
      outputKinds: [...this.outputKinds],
      childIds: this.children.map((c) => c.id),
      box: this.box as readonly [number, number]
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)

    let needRebuild = false

    // —— 输入端口 kind 恢复 ——
    let newInputKinds = this.inputKinds
    const storedInputKinds = state.inputKinds
    if (Array.isArray(storedInputKinds)) {
      const parsed: Kind[] = []
      for (const k of storedInputKinds) {
        if (typeof k === 'string' && ALL_KINDS.includes(k as Kind)) {
          parsed.push(k as Kind)
        }
      }
      if (parsed.length > 0) {
        if (parsed.length !== this.inputKinds.length || parsed.some((k, i) => k !== this.inputKinds[i])) {
          newInputKinds = parsed
          needRebuild = true
        }
      }
    } else if (typeof state.kind === 'string' && ALL_KINDS.includes(state.kind as Kind)) {
      // 旧数据兼容：没有 inputKinds 时从全局 kind + inputPortCount 推导
      const count = typeof state.inputPortCount === 'number' && state.inputPortCount >= MIN_PORT_COUNT
        ? state.inputPortCount : this.inputKinds.length
      newInputKinds = new Array(count).fill(state.kind as Kind)
      needRebuild = true
    } else if (typeof state.inputPortCount === 'number' && state.inputPortCount !== this.inputKinds.length) {
      // 只有数量变化：扩展或截断当前 kinds 数组
      const target = state.inputPortCount
      if (target > this.inputKinds.length) {
        newInputKinds = [...this.inputKinds, ...new Array(target - this.inputKinds.length).fill(DEFAULT_KIND)]
      } else {
        newInputKinds = this.inputKinds.slice(0, target)
      }
      needRebuild = true
    }

    // —— 输出端口 kind 恢复 ——
    let newOutputKinds = this.outputKinds
    const storedOutputKinds = state.outputKinds
    if (Array.isArray(storedOutputKinds)) {
      const parsed: Kind[] = []
      for (const k of storedOutputKinds) {
        if (typeof k === 'string' && ALL_KINDS.includes(k as Kind)) {
          parsed.push(k as Kind)
        }
      }
      if (parsed.length > 0) {
        if (parsed.length !== this.outputKinds.length || parsed.some((k, i) => k !== this.outputKinds[i])) {
          newOutputKinds = parsed
          needRebuild = true
        }
      }
    } else if (typeof state.kind === 'string' && ALL_KINDS.includes(state.kind as Kind)) {
      // 旧数据兼容：没有 outputKinds 时从全局 kind + outputPortCount 推导
      const count = typeof state.outputPortCount === 'number' && state.outputPortCount >= MIN_PORT_COUNT
        ? state.outputPortCount : this.outputKinds.length
      newOutputKinds = new Array(count).fill(state.kind as Kind)
      needRebuild = true
    } else if (typeof state.outputPortCount === 'number' && state.outputPortCount !== this.outputKinds.length) {
      const target = state.outputPortCount
      if (target > this.outputKinds.length) {
        newOutputKinds = [...this.outputKinds, ...new Array(target - this.outputKinds.length).fill(DEFAULT_KIND)]
      } else {
        newOutputKinds = this.outputKinds.slice(0, target)
      }
      needRebuild = true
    }

    if (needRebuild) {
      this.inputKinds = newInputKinds
      this.outputKinds = newOutputKinds
      this.rebuildAllPorts()
      this.updateBox()
      this.notifyChanged()
    }

    // —— 容器：box + childIds ——
    const box = state.box as [number, number] | undefined
    if (box !== undefined) this.setBox(box[0], box[1])

    const ids = state.childIds
    if (Array.isArray(ids)) {
      this.pendingChildIds = ids.filter((x): x is string => typeof x === 'string')
    }
  }

  /** 销毁前批量释放子节点回画布，避免子节点丢失 */
  override beforeDestroy(): void {
    // 先释放，保证 super.beforeDestroy 不会让 scene 把已消失的子节点也当孤儿处理
    while (this.children.length > 0) {
      this.removeChild(this.children[this.children.length - 1])
    }
    super.beforeDestroy()
  }
}
