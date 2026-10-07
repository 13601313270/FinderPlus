import { StringValue } from '../../engine/data/StringValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'

/** 定时器 tick 间隔（毫秒）——每秒检查一次是否命中时间表 */
const TICK_INTERVAL_MS = 1000

/** 输出端口 label */
const OUTPUT_LABEL = { zh: '触发时间', en: 'Trigger Time' } as const

/** 时间字符串的正则校验：HH:MM，24 小时制 */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

/** 默认时间表 */
const DEFAULT_SCHEDULE = ['08:00']

/** 默认节点 box 尺寸 */
const DEFAULT_BOX: [number, number] = [260, 200]

/** resize 时钳制的最小宽高——再小时间表就挤没了 */
const MIN_W = 180
const MIN_H = 140

/**
 * 定时触发节点（Schedule）：在时间表规定的每天固定时刻触发，
 * 触发时向输出端口 commit 一个包含当前时间的字符串。
 *
 * 行为：
 * - 源头节点：没有输入端口，只有一个 StringValue 输出端口
 * - 启停开关关闭时不触发，但定时器仍在跑（tick 里判断 enabled 跳过）
 * - 每秒 tick 一次，比较当前 HH:MM 是否命中时间表
 * - 同一分钟内只触发一次（用 lastTriggerKey 去重，覆盖 setInterval 在同一分钟内多次命中的情况）
 * - 触发体是同步 commit，不涉及异步 I/O，所以不存在经验案例提到的并发堆积风险
 * - 节点销毁前 clearInterval，防止泄漏
 */
export class ScheduleNode extends Node {
  static readonly TYPE = 'schedule'
  readonly type = ScheduleNode.TYPE

  /** 输出端口：触发时发送时间字符串 */
  readonly output = new OutputPort('trigger', StringValue, OUTPUT_LABEL)

  /** 时间表：HH:MM 格式字符串数组（已去重 + 排序 + 校验） */
  private schedule: string[] = [...DEFAULT_SCHEDULE]

  /** 是否启用触发 */
  private enabled = true

  /** 定时器 id；undefined 表示未启动 */
  private timer: ReturnType<typeof setInterval> | undefined

  /**
   * 上次触发的"日期+分钟"键（如 "2026-10-07 08:00"）。
   * 用于去重：同一分钟内 setInterval 会触发多次 tick，
   * 但我们只让它 commit 一次输出。
   *
   * 设计参考了经验案例 100018307 的"单一幂等入口"思想——
   * 所有触发路径（定时 / 手动 / 测试）最终都走同一个 commit 调用点，
   * 去重逻辑就收敛在 tick 函数里，不分散在多个入口。
   */
  private lastTriggerKey = ''

  constructor(id: string) {
    super(id)
    this.addOutput(this.output)
    const [w, h] = DEFAULT_BOX
    this.setBox(w, h)
  }

  /** resize handle 拖拽时的最小尺寸钳制 */
  override setBox(width: number, height: number): void {
    super.setBox(Math.max(MIN_W, Math.round(width)), Math.max(MIN_H, Math.round(height)))
  }

  // —— Node 基类抽象方法 ——

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  /** 源头节点，没有输入端口 */
  inputPortReceiveValue(_ports: InputPort[]): void {}

  // —— UI 读的状态 ——

  /** 当前时间表（已排序去重） */
  get displaySchedule(): readonly string[] {
    return this.schedule
  }

  /** 是否启用触发 */
  get isEnabled(): boolean {
    return this.enabled
  }

  /** 定时器是否在跑（UI 显示状态点） */
  get isRunning(): boolean {
    return this.timer !== undefined
  }

  /**
   * 计算下次触发时间（本地时区），用于 UI 展示。
   * 如果时间表为空或全无效，返回 null。
   */
  get nextTriggerTime(): string | null {
    const valid = this.schedule.filter((t) => TIME_REGEX.test(t)).sort()
    if (valid.length === 0) return null

    const now = new Date()
    const curHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`

    // 找今天最近的一个 >= 当前时刻
    for (const t of valid) {
      if (t > curHM) return `今天 ${t}`
    }
    // 都过了 → 明天第一个
    return `明天 ${valid[0]}`
  }

  // —— 配置修改 ——

  /**
   * 替换整个时间表（UI 增删行后调用）。
   * 自动去重 + 排序 + 过滤非法值，避免 tick 里每次都校验。
   */
  setSchedule(rawList: string[]): void {
    const cleaned = Array.from(
      new Set(rawList.filter((t): t is string => TIME_REGEX.test(t)))
    ).sort()
    // 内容真的变了才写，避免无意义的 notifyChanged 循环
    if (arraysEqual(cleaned, this.schedule)) return
    this.schedule = cleaned
    this.notifyChanged()
  }

  /** 启停开关 */
  setEnabled(value: boolean): void {
    if (value === this.enabled) return
    this.enabled = value
    this.notifyChanged()
  }

  /** 切换开关 */
  toggleEnabled(): void {
    this.setEnabled(!this.enabled)
  }

  // —— 定时器管理 ——

  /**
   * 启动定时器。幂等——已启动直接跳过。
   *
   * 调用时机：render.vue 的 onMounted。
   * 无论是新建节点还是从 DB 恢复的节点，都会走一遍 mount，
   * 所以这里统一覆盖了两种场景。
   */
  startTimer(): void {
    if (this.timer !== undefined) return
    this.lastTriggerKey = ''
    this.timer = setInterval(() => this.tick(), TICK_INTERVAL_MS)
    this.notifyChanged()
  }

  /** 停止定时器。一般只在 beforeDestroy 里调 */
  stopTimer(): void {
    if (this.timer === undefined) return
    clearInterval(this.timer)
    this.timer = undefined
    this.notifyChanged()
  }

  /**
   * 手动立即触发一次（忽略去重、忽略 enabled 开关）。
   * UI 提供"测试"按钮方便验证下游连线是否通。
   */
  triggerNow(): void {
    const now = new Date()
    const ts = formatTimestamp(now)
    this.beginRun()
    this.output.commit(new StringValue(`手动触发 @ ${ts}`), { force: true })
    this.notifyChanged()
    this.completeRun()
  }

  /**
   * 每秒被 setInterval 调用一次。
   * 整个函数体是同步操作，不涉及异步 I/O，
   * 所以不存在经验案例 100011337 提到的"定时器堆积 + 悬挂"风险。
   *
   * 如果未来扩展成"触发前要先做 HTTP 请求再 commit"，
   * 就需要把 setInterval 改成"上一轮 tick 完成后 setTimeout 调度下一轮"。
   */
  private tick(): void {
    if (!this.enabled) return
    if (this.schedule.length === 0) return

    const now = new Date()
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    if (!this.schedule.includes(hhmm)) return

    // 去重：同一分钟内只触发一次
    const key = `${formatDate(now)} ${hhmm}`
    if (key === this.lastTriggerKey) return
    this.lastTriggerKey = key

    const ts = formatTimestamp(now)
    this.beginRun()
    this.output.commit(new StringValue(ts), { force: true })
    this.notifyChanged()
    this.completeRun()
  }

  // —— 生命周期钩子 ——

  /** 删除节点前清理定时器，防止"删了节点还在跑 setInterval"泄漏 */
  beforeDestroy(): void {
    this.stopTimer()
  }

  saveState(): Record<string, unknown> {
    const [w, h] = this.box
    return {
      schedule: [...this.schedule],
      enabled: this.enabled,
      box: [w, h]
    }
  }

  readState(state: Record<string, unknown>): void {
    if (Array.isArray(state.schedule)) {
      const cleaned = Array.from(
        new Set(
          state.schedule.filter(
            (t): t is string => typeof t === 'string' && TIME_REGEX.test(t)
          )
        )
      ).sort()
      this.schedule = cleaned.length > 0 ? cleaned : [...DEFAULT_SCHEDULE]
    }
    if (typeof state.enabled === 'boolean') {
      this.enabled = state.enabled
    }
    // 恢复 box 尺寸；老数据没存 box 就保持构造时的默认值
    const box = state.box as [number, number] | undefined
    if (box !== undefined && Array.isArray(box)) {
      this.setBox(Math.round(box[0]), Math.round(box[1]))
    }
    this.notifyChanged()
  }
}

// —— 工具函数 ——

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatTimestamp(d: Date): string {
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
