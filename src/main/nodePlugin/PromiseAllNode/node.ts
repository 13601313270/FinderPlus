import { BoolValue } from '../../engine/data/BoolValue'
import { FileValue } from '../../engine/data/FileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { Value, type ValueKind } from '../../engine/data/Value'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { EdgeBatch } from '../../engine/graph/EdgeBatch'
import type { Edge } from '../../engine/graph/Edge'

/** OutputPort 构造函数需要的 Value 子类形状（与 OutputPort.ts 里的 ValueClass 同构但未导出，这里内联） */
type ValueClass = { readonly VALUE_NAME: ValueKind; prototype: Value; new (...args: any[]): Value }

/** 输入端口类型标签复用 SwitchNode 的全部具体 Value 子类 */
const ALL_VALUE_CLASSES = [StringValue, NumberValue, BoolValue, FileValue, ImgFileValue, JsonValue]

/** 端口标签多语言前缀，动态端口会拼接序号，如 "输入 1" / "Output 1" */
const IN_LABEL = {
  zh: '输入',
  en: 'Input',
  ja: '入力',
  ko: '입력',
  es: 'Entrada',
  ar: 'الإدخال',
  fr: 'Entrée',
  pt: 'Entrada',
  ru: 'Ввод',
  hi: 'इनपुट',
  id: 'Masukan',
  de: 'Eingabe',
  vi: 'Nhập liệu',
  tr: 'Giriş',
  it: 'Input'
}
const OUT_LABEL = {
  zh: '输出 →',
  en: 'Output →',
  ja: '出力 →',
  ko: '출력 →',
  es: 'Salida →',
  ar: 'المخرجات →',
  fr: 'Sortie →',
  pt: 'Saída →',
  ru: 'Выход →',
  hi: 'आउटपुट →',
  id: 'Output →',
  de: 'Ausgabe →',
  vi: 'Đầu ra →',
  tr: 'Çıktı →',
  it: 'Uscita →'
}

/** 内容区尺寸基础值 + 每增加一个端口对追加的高度 */
const NODE_WIDTH = 190
const BASE_HEIGHT = 60
const PER_PORT_HEIGHT = 34

/** 端口对最小数量 */
const MIN_PORT_COUNT = 2

/**
 * SVG 数据流动画时长（毫秒）。
 * commit 先做，让下游立刻拿到值；动画播完才 clear receivedSet——
 * 中间这段时间渲染层读到 triggering=true，能在卡片内画"圆点从左飞到右"的动画。
 * 渲染层 animateMotion duration 必须和这里一致，视觉与语义才同步。
 */
const ANIMATION_MS = 500

/**
 * PromiseAll 汇合节点：等所有 N 个输入端口都收到了值，才把它们同时 commit 到 N 个输出端口。
 *
 * 语义同 JS Promise.all——N 个上游全部就绪 → 一起触发 → 重置"本轮已收到"标记，进入下一轮等待。
 *
 * 核心机制：
 * - 用内部 receivedSet<InputPort> 追踪「这一轮已收到值的输入端口」，而不是读 InputPort.value——
 *   InputPort.receive 的指纹去重机制会让"同值重发"不触发通知，receivedSet 在触发后清空，
 *   自然实现了一轮一轮的语义。
 * - 每个输入端口 accepts 所有内置 Value 子类；对应的输出端口 valueClass 跟随上游实际送入的
 *   类型动态重建（同 SwitchNode.ensureOutputsMatch）。
 *
 * 持久化：只存 portCount，端口内容由上游重新 commit 自动重建。
 */
export class PromiseAllNode extends Node {
  static readonly TYPE = 'promise-all'
  readonly type = PromiseAllNode.TYPE

  /** 当前端口对数量（N） */
  private portCount: number

  /** 输入端口列表，与 outputPorts 一一对应 */
  private readonly inputPortsList: InputPort[] = []

  /** 输出端口列表，与 inputPortsList 一一对应 */
  private readonly outputPortsList: OutputPort[] = []

  /** 本轮已收到值的输入端口集合。触发后清空，开始新一轮 */
  private readonly receivedSet = new Set<InputPort>()

  /**
   * 正在触发动画中：commit 已做，receivedSet 暂未清空。
   * 渲染层读到 true 时在卡片内画 SVG 数据流动画（圆点从左飞到右）。
   * ANIMATION_MS 后自动复位为 false 并 clear receivedSet。
   */
  private triggering = false

  /** SVG 动画时长常量，渲染层也需要读到 */
  static readonly FLOW_ANIMATION_MS = ANIMATION_MS

  /** 当前是否处于触发动画中（渲染层读） */
  get isTriggering(): boolean {
    return this.triggering
  }

  constructor(id: string, initialCount = MIN_PORT_COUNT) {
    super(id)
    this.portCount = Math.max(MIN_PORT_COUNT, initialCount)
    for (let i = 0; i < this.portCount; i++) {
      this.addPortPair(i)
    }
    this.updateBox()
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件拖入
  }

  // —— 渲染层读的状态 ——

  /** 当前端口对数量 */
  get displayPortCount(): number {
    return this.portCount
  }

  /** 本轮已就绪的输入数量（UI 显示 "ready/total" 用） */
  get readyCount(): number {
    return this.receivedSet.size
  }

  /** 第 index 对端口是否已就绪（渲染层逐个显示状态用） */
  isPortReady(index: number): boolean {
    const port = this.inputPortsList[index]
    return port !== undefined && this.receivedSet.has(port)
  }

  // —— 端口对管理 ——

  /** 构建第 i 对端口。输入 accepts 全类型，输出先按 StringValue 占位（等上游来值后 ensureOutputsMatch 改） */
  private addPortPair(index: number): void {
    const inPort = new InputPort(`in_${index}`, {
      accepts: ALL_VALUE_CLASSES,
      label: appendIndex(IN_LABEL, index),
      isHiddenLabel: true
    })
    // 先按 StringValue 占位——SwitchNode 同构
    const outPort = new OutputPort(`out_${index}`, StringValue, appendIndex(OUT_LABEL, index))
    this.inputPortsList.push(inPort)
    this.outputPortsList.push(outPort)
    this.addInput(inPort)
    this.addOutput(outPort)
  }

  /** 在末尾追加一对端口，供 UI 的「+」按钮调用 */
  addPortPairAtEnd(): void {
    const idx = this.portCount
    this.portCount = idx + 1
    this.addPortPair(idx)
    this.updateBox()
    this.notifyChanged()
  }

  /**
   * 移除第 index 对端口。index 必须在有效范围内且总数 > MIN_PORT_COUNT。
   * 移除后会重建全部端口（因为 id 需要连续）。
   */
  removePortPairAt(index: number): void {
    if (this.portCount <= MIN_PORT_COUNT) return
    if (index < 0 || index >= this.portCount) return

    // 先全部从 Node 注销（removeInput / removeOutput 会自动断边）
    for (const p of this.inputPortsList) this.removeInput(p)
    for (const p of this.outputPortsList) this.removeOutput(p)
    this.inputPortsList.length = 0
    this.outputPortsList.length = 0
    this.receivedSet.clear()

    // 重建——跳过被移除的那一对
    const newCount = this.portCount - 1
    this.portCount = newCount
    for (let i = 0; i < this.portCount; i++) {
      this.addPortPair(i)
    }
    this.updateBox()
    this.notifyChanged()
  }

  /** 按当前端口对数量更新内容区高度 */
  private updateBox(): void {
    this.setBox(NODE_WIDTH, BASE_HEIGHT + this.portCount * PER_PORT_HEIGHT)
  }

  // —— 重算 ——

  /**
   * 任一输入端口收到值 / 连线增删时被调用。
   *
   * 逻辑（参考 HumanReviewNode）：
   * 1. 先同步对齐所有端口对的输出端口 valueClass——
   *    用 edge.startPort.valueClass 从边上直接拿上游类型，**不依赖上游是否真的 commit 过值**。
   *    这样 bindEdge 刚连线就能对齐，下游 canBindEdge 校验不会因类型不匹配被拒。
   * 2. 再根据触发端口的当前值状态更新 receivedSet（有值→加，无值→删）。
   * 3. receivedSet.size === portCount → 全部齐了！依次 commit 到对应输出端口 → 清空 → 下一轮。
   */
  inputPortReceiveValue(ports: InputPort[]): void {
    // —— 第一步：全量同步输出端口类型（HumanReviewNode 同构） ——
    for (let i = 0; i < this.portCount; i++) {
      const inPort = this.inputPortsList[i]
      const outPort = this.outputPortsList[i]
      const upstreamClass = this.resolveUpstreamValueClass(inPort)
      if (upstreamClass && outPort.valueClass !== upstreamClass) {
        this.rebuildOutputPort(i, upstreamClass)
      }
    }

    // —— 第二步：更新 receivedSet ——
    for (const port of ports) {
      const [value] = port.value
      if (value !== undefined) {
        this.receivedSet.add(port)
      } else {
        this.receivedSet.delete(port)
      }
    }

    if (this.receivedSet.size !== this.portCount) {
      this.notifyChanged()
      return
    }

    // —— 第三步：齐了！先 commit（下游立刻拿到值），再等动画播完才清 receivedSet ——
    if (!this.triggering) {
      this.triggerAllAvailable(true)
    } else {
      // 正在上一轮动画中——收到新值也 commit，下游值已经是最新的，
      // 但不重复触发动画（上一轮还没结束），receivedSet 也不清
      this.commitAllAvailable(true)
      this.completeRun()
    }
  }

  /**
   * 手动触发：不等全部就绪，把当前已有值的端口立刻 commit 下去。
   * 点击前 UI 已做 window.confirm 二次确认——告知用户"跳过 N 个未就绪端口"的风险。
   *
   * 用 { force: true } 绕过指纹排重——同一个值在上一轮 commit 过也能再推一次。
   * 未就绪端口（value === undefined）静默跳过，不发 null。
   */
  forceTrigger(): void {
    if (this.triggering) return
    this.triggerAllAvailable(true)
  }

  /**
   * 把所有已有值的输入端口对应输出端口的值，按目标下游 Node 分组后一次性分发。
   * 同一目标 Node 有 ≥2 条边 → EdgeBatch 批量发送（合并成一次 _onInputPortChanged）；
   * 只有 1 条边 → 走单条路径 edge.transferData（等价于原来的 outPort.commit）。
   *
   * 这样比如 7 个输出端口分别连到 A(3条)、B(3条)、C(1条)，
   * A 收到 1 次合并通知，B 收到 1 次合并通知，C 收到 1 次单条通知。
   * @param force true 时跳过 fingerprint 排重，所有通道都强推
   */
  private commitAllAvailable(force: boolean): void {
    // 第一步：存 OutputPort.currentValue（UI tooltip + 后续 fingerprint 比对需要），
    // 同时收集所有 (edge, value) 对
    type EdgeValuePair = { edge: Edge; value: Value }
    const allPairs: EdgeValuePair[] = []

    for (let i = 0; i < this.portCount; i++) {
      const inPort = this.inputPortsList[i]
      const outPort = this.outputPortsList[i]
      const [value] = inPort.value
      if (value === undefined) continue

      outPort.setCurrentValue(value)
      for (const edge of outPort.edges) {
        allPairs.push({ edge, value })
      }
    }

    // 第二步：按目标 Node 分桶
    const byOwner = new Map<Node, { edges: Edge[]; values: Value[] }>()
    for (const { edge, value } of allPairs) {
      const owner = edge.endPort.getOwner()
      if (!owner) continue
      const group = byOwner.get(owner) ?? { edges: [], values: [] }
      group.edges.push(edge)
      group.values.push(value)
      byOwner.set(owner, group)
    }

    // 第三步：分发——桶里 ≥2 条走 EdgeBatch，1 条走单条路径
    for (const [, group] of byOwner) {
      if (group.edges.length >= 2) {
        new EdgeBatch(group.edges).transferData(group.values, force)
      } else {
        const edge = group.edges[0]!
        const value = group.values[0]!
        edge.transferData(value, force)
      }
    }
  }

  /**
   * commit + 播动画 + 动画结束后清 receivedSet。自动触发和手动触发共用。
   */
  private triggerAllAvailable(force: boolean): void {
    this.commitAllAvailable(force)
    this.completeRun()

    this.triggering = true
    this.notifyChanged() // 渲染层读到 triggering=true → 开始播 SVG 动画

    // 动画时长到了才清——给渲染层足够时间把"从左飞到右"的动画播完，
    // 最后才把绿点归灰，用户能看到清晰的触发反馈
    setTimeout(() => {
      this.receivedSet.clear()
      this.triggering = false
      this.notifyChanged()
    }, ANIMATION_MS)
  }

  /**
   * 从输入端口的 incoming 边里取上游 OutputPort 的 valueClass。
   * 优先取**有值的边**（最准确），退而求其次取**第一条边**（刚连线还没值时也能拿到类型）。
   */
  private resolveUpstreamValueClass(inPort: InputPort): ValueClass | undefined {
    if (inPort.incoming.size === 0) return undefined
    // 优先：有值的边（fingerprint 比对用的真实类型）
    for (const [edge, val] of inPort.incoming) {
      if (val !== undefined) return edge.startPort.valueClass
    }
    // 退化：第一条边（刚连线还没 commit，但其 OutputPort 已经声明了 valueClass）
    const firstEdge = inPort.incoming.keys().next().value
    if (firstEdge) return firstEdge.startPort.valueClass
    return undefined
  }

  /** 重建第 index 个输出端口为指定 valueClass。
   * 下游边随 removeOutput 自动断开；新端口用 addOutput(newPort, index) 插回原位置，
   * 保持 Node.outputs 数组顺序稳定——右侧端口列的 V-for 渲染顺序就不会乱。 */
  private rebuildOutputPort(index: number, valueClass: ValueClass): void {
    const oldPort = this.outputPortsList[index]
    if (!oldPort) return
    const newPort = new OutputPort(oldPort.id, valueClass, appendIndex(OUT_LABEL, index))
    this.removeOutput(oldPort)
    this.outputPortsList[index] = newPort
    // 关键：指定 index 插回原位置，而不是 push 到末尾
    this.addOutput(newPort, index)
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return { portCount: this.portCount }
  }

  readState(state: Record<string, unknown>): void {
    const stored = state.portCount
    if (typeof stored !== 'number' || stored < MIN_PORT_COUNT || stored === this.portCount) return

    // 全部重建
    for (const p of this.inputPortsList) this.removeInput(p)
    for (const p of this.outputPortsList) this.removeOutput(p)
    this.inputPortsList.length = 0
    this.outputPortsList.length = 0
    this.receivedSet.clear()
    this.portCount = Math.max(MIN_PORT_COUNT, stored)
    for (let i = 0; i < this.portCount; i++) {
      this.addPortPair(i)
    }
    this.updateBox()
    this.notifyChanged()
  }
}

/** 多语言标签加序号：{ zh: '输入' } + 0 → { zh: '输入 1' }（序号从 1 开始，更友好） */
function appendIndex(labelObj: Record<string, string>, index: number): Record<string, string> {
  const num = index + 1
  const result: Record<string, string> = {}
  for (const key of Object.keys(labelObj)) {
    result[key] = `${labelObj[key]} ${num}`
  }
  return result
}
