import { JsonValue } from '../../engine/data/JsonValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/**
 * JSON 解析展示节点：接受字符串（JSON 文本）或结构化 JSON（JsonValue），
 * 解析后以折叠树形式可视化，同时透传 JsonValue 到输出端口供下游继续处理。
 */
export class JsonDisplayNode extends Node {
  static readonly TYPE = 'json-display'
  readonly type = JsonDisplayNode.TYPE

  /** 输入端口：接受 JSON 文本（StringValue）或结构化 JSON（JsonValue） */
  readonly jsonInput = new InputPort('json', {
    accepts: [StringValue, JsonValue],
    label: {
      zh: 'JSON',
      en: 'JSON',
      ja: 'JSON',
      ko: 'JSON',
      es: 'JSON',
      ar: 'JSON',
      fr: 'JSON',
      pt: 'JSON',
      ru: 'JSON',
      hi: 'JSON',
      id: 'JSON',
      de: 'JSON',
      vi: 'JSON',
      tr: 'JSON',
      it: 'JSON'
    }
  })

  /** 输出端口：解析成功后透传 JsonValue；解析失败或空输入时 clear() */
  readonly jsonOutput = new OutputPort('json', JsonValue, {
    zh: 'JSON',
    en: 'JSON',
    ja: 'JSON',
    ko: 'JSON',
    es: 'JSON',
    ar: 'JSON',
    fr: 'JSON',
    pt: 'JSON',
    ru: 'JSON',
    hi: 'JSON',
    id: 'JSON',
    de: 'JSON',
    vi: 'JSON',
    tr: 'JSON',
    it: 'JSON'
  })

  private parsed: unknown = undefined
  private error: string | null = null
  private hasValue = false

  constructor(id: string) {
    super(id)
    this.addInput(this.jsonInput)
    this.addOutput(this.jsonOutput)
    this.setBox(320, 280)
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件
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

  /** 收到上游值：解析/透传后 commit 给输出端口，失败则 clear */
  inputPortReceiveValue(_ports: InputPort[]): void {
    const [first] = this.jsonInput.value
    this.hasValue = true

    if (first instanceof JsonValue && !first.isNull) {
      this.parsed = first.value
      this.error = null
      this.jsonOutput.commit(first)
    } else if (first instanceof StringValue && !first.isNull) {
      const raw = first.value!
      if (!raw.trim()) {
        this.parsed = undefined
        this.error = null
        this.jsonOutput.clear()
      } else {
        try {
          const obj = JSON.parse(raw)
          this.parsed = obj
          this.error = null
          this.jsonOutput.commit(new JsonValue(obj))
        } catch (e) {
          this.parsed = undefined
          this.error = e instanceof Error ? e.message : String(e)
          this.jsonOutput.clear()
        }
      }
    } else {
      this.parsed = undefined
      this.error = null
      this.jsonOutput.clear()
    }
    this.notifyChanged()
    // 同步节点：解析 + commit 输出就算消化完输入 → 回 stable
    this.completeRun()
  }

  saveState(): Record<string, unknown> {
    // parsed/error 是上游派生出来的，恢复时上游 commit 会自动刷回来，不用存；
    // box（用户拖右下角调整过的大小）是本节点自己的状态，必须存。
    return {
      box: this.box as readonly [number, number]
    }
  }

  readState(state: Record<string, unknown>): void {
    // 恢复用户调整过的尺寸（老数据缺该字段时保留构造时的默认 box）
    const box = state.box
    if (Array.isArray(box) && box.length === 2 && box.every((v) => typeof v === 'number')) {
      this.setBox(box[0], box[1])
    }
    // 派生状态等上游恢复后自然会刷新
  }
}
