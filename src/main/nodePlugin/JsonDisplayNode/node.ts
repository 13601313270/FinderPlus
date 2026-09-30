import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { Node } from '../../engine/node/Node'

/**
 * JSON 解析展示节点：把上游送来的字符串解析成 JSON 后以折叠树形式可视化。
 * 没有输出端口——它的产出就是「可视化」这件事本身，UI 直接读 parsed / error。
 */
export class JsonDisplayNode extends Node {
  static readonly TYPE = 'json-display'
  readonly type = JsonDisplayNode.TYPE

  /** 输入端口：只接受字符串 */
  readonly jsonInput = new InputPort('json', { accepts: [StringValue], label: 'JSON' })

  private parsed: unknown = undefined
  private error: string | null = null
  private hasValue = false

  constructor(id: string) {
    super(id)
    this.addInput(this.jsonInput)
    this.setBox(320, 280)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 解析后的 JSON 值；解析失败或没接输入时为 undefined */
  get value(): unknown {
    return this.parsed
  }

  /** JSON 解析错误信息；没接输入或解析成功时为 null */
  get parseError(): string | null {
    return this.error
  }

  /** 是否有过输入（用来区分「空值」和「还没接过输入」） */
  get hasInput(): boolean {
    return this.hasValue
  }

  /** 收到上游字符串 → 尝试 JSON.parse → 存 parsed 或 error → 刷 UI */
  inputPortReceiveValue(_ports: InputPort[]): void {
    const [first] = this.jsonInput.value
    const raw = first instanceof StringValue ? first.value : ''
    this.hasValue = true

    if (!raw.trim()) {
      this.parsed = undefined
      this.error = null
    } else {
      try {
        this.parsed = JSON.parse(raw)
        this.error = null
      } catch (e) {
        this.parsed = undefined
        this.error = e instanceof Error ? e.message : String(e)
      }
    }
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    // parsed / error 都是上游派生出来的，恢复时上游 commit 会自动刷回来，不用存
    return {}
  }

  readState(_state: Record<string, unknown>): void {
    // 啥也不做——派生状态等上游恢复后自然会刷新
  }
}
