import { BoolValue } from '../../engine/data/BoolValue'
import { FileValue } from '../../engine/data/FileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { TxtFileValue } from '../../engine/data/TxtFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { Node } from '../../engine/node/Node'
import { inLabel } from './i18n'

/**
 * 通知节点（Notify）：终端节点，收到任意值时发起系统级通知。
 *
 * 行为：
 * - 单输入端口，接受所有内置 Value 子类
 * - 值到达时，提取 displayLabel 作为通知标题/正文，调用 window.notificationApi.show
 * - 无输出端口——通知是终端语义，不向下游传播
 * - 同步节点：发完通知立即 completeRun()
 */
export class NotifyNode extends Node {
  static readonly TYPE = 'notify'
  readonly type = NotifyNode.TYPE

  /** 所有内置 Value 子类 */
  private static readonly ALL_VALUE_CLASSES = [
    StringValue, NumberValue, BoolValue, JsonValue, FileValue, ImgFileValue, TxtFileValue
  ]

  /** 输入端口 */
  private readonly inputPort: InputPort

  constructor(id: string) {
    super(id)
    this.inputPort = new InputPort('in', {
      accepts: NotifyNode.ALL_VALUE_CLASSES,
      label: inLabel,
      isHiddenLabel: true
    })
    this.addInput(this.inputPort)
    // header(~24px) + 内容区(~32px)
    this.setBox(120, 56)
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  // —— 输入：发通知 ——

  inputPortReceiveValue(_ports: InputPort[]): void {
    const [value] = this.inputPort.value
    if (value === undefined) {
      // 有连线但还没值 → 无事可做
      this.completeRun()
      return
    }

    const body = value.displayLabel || '收到一条消息'
    // bracket 访问绕过 node tsconfig 的 Window 类型差异（web tsconfig 正常）
    const w = window as unknown as {
      notificationApi?: { show: (t: string, b?: string, m?: Record<string, unknown>) => Promise<unknown> }
      getCurrentCanvasId?: () => string
    }
    if (w.notificationApi) {
      const canvasId = w.getCurrentCanvasId?.()
      // fire-and-forget：通知发丢了不影响节点逻辑
      w.notificationApi.show('通知', body, {
        ...(canvasId ? { canvasId } : {}),
        nodeId: this.id
      }).catch(() => { /* noop */ })
    }

    this.notifyChanged()
    this.completeRun()
  }

  // —— 持久化 ——

  /** 无配置项，无需持久化 */
  saveState(): Record<string, unknown> {
    return { ...super.saveState() }
  }

  readState(_state: Record<string, unknown>): void {
    super.readState(_state)

    // 无配置项需要恢复
  }
}
