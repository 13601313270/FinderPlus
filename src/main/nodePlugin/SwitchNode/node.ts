import { BoolValue } from '../../engine/data/BoolValue'
import { FileValue } from '../../engine/data/FileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { Value, type ValueKind } from '../../engine/data/Value'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/** OutputPort 构造函数需要的 Value 子类形状（与 OutputPort.ts 里的 ValueClass 同构但未导出，这里内联） */
type ValueClass = { readonly VALUE_NAME: ValueKind; prototype: Value; new (...args: any[]): Value }

/**
 * 条件分支 Switch 节点：按一个布尔条件分流一条数据流。
 *
 * - conditionInput 接 BoolValue，决定走 pass 还是 fail
 * - dataInput 接任意 Value（String / Number / Bool / File / ImgFile / TxtFile 等），被分流的就是它
 * - 两个输出端口：passOutput 条件为真时拿数据，failOutput 条件为假时拿数据
 *
 * 任意输入变化（条件改了 / 数据改了 / 断边清值）都会触发重算：
 * 先把两个输出都 clear（清干净下游旧值），再往命中的那一路 commit 新值。
 * 两边都没到齐时 → 两边都保持空，等待。
 *
 * 输出端口的 valueClass 跟随上游数据类型动态重建——
 * 跟 CodeNode 按返回类型重建 OutputPort 同构：上游类型变了就拆旧建新（旧端口连的下游边会一起断）。
 *
 * 没有中间态（loading / error 对 Switch 没意义），所以不需要 status 字段——
 * UI 高亮直接用 lastCondition 派生。
 */
export class SwitchNode extends Node {
  static readonly TYPE = 'switch'
  readonly type = SwitchNode.TYPE

  /** 所有当前具体 Value 子类（FileValue 覆盖 ImgFileValue / TxtFileValue 的继承链） */
  private static readonly ALL_VALUE_CLASSES = [StringValue, NumberValue, BoolValue, FileValue]

  /** 输入端口：布尔条件 */
  readonly conditionInput = new InputPort('cond', {
    accepts: [BoolValue],
    label: {
      zh: '条件',
      en: 'Condition',
      ja: '条件',
      ko: '조건',
      es: 'Condición',
      ar: 'الشرط',
      fr: 'Condition',
      pt: 'Condição',
      ru: 'Условие',
      hi: 'शर्त',
      id: 'Kondisi',
      de: 'Bedingung',
      vi: 'Điều kiện',
      tr: 'Koşul',
      it: 'Condizione'
    }
  })

  /** 输入端口：被分流的数据（接受所有具体 Value 子类） */
  readonly dataInput = new InputPort('data', {
    accepts: SwitchNode.ALL_VALUE_CLASSES,
    label: {
      zh: '传入数据',
      en: 'Input Data',
      ja: '入力データ',
      ko: '입력 데이터',
      es: 'Datos de entrada',
      ar: 'بيانات الإدخال',
      fr: 'Données d\'entrée',
      pt: 'Dados de entrada',
      ru: 'Входные данные',
      hi: 'इनपुट डेटा',
      id: 'Data Masukan',
      de: 'Eingabedaten',
      vi: 'Dữ liệu đầu vào',
      tr: 'Girdi Verisi',
      it: 'Dati di input'
    }
  })

  /** 输出端口：条件为真时的数据（valueClass 跟随上游数据类型动态重建） */
  private passOutput: OutputPort | undefined

  /** 输出端口：条件为假时的数据（同上） */
  private failOutput: OutputPort | undefined

  /** 上次看到的条件值（undefined = 还没收到过）。仅用于 UI 高亮恢复 */
  private lastCondition: boolean | undefined

  constructor(id: string) {
    super(id)
    this.addInput(this.conditionInput)
    this.addInput(this.dataInput)
    // 先按 StringValue 占位建输出端口——等上游数据一来就会按真实类型重建
    this.rebuildOutputPorts(StringValue)
    // 内容区硬约束：紧凑 T 型分叉导视图
    this.setBox(100, 70)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件 */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  // —— 渲染层读的状态 ——

  /** 当前条件是否生效；undefined = 条件端口还没值 */
  get displayCondition(): boolean | undefined {
    return this.lastCondition
  }

  // —— 重算 ——

  /** 任一输入变化 → 确保输出端口类型对齐 → 清两边 → 只 commit 命中的一路 */
  inputPortReceiveValue(_ports: InputPort[]): void {
    const [cond] = this.conditionInput.value
    const [data] = this.dataInput.value
    const ok = cond instanceof BoolValue

    // 先把两边都清掉，不管有没有值要发——防止旧值残留（stale-call 问题的分流变体）
    this.passOutput?.clear()
    this.failOutput?.clear()

    if (!ok || data === undefined) {
      // 条件没到 / 数据没到 → 两边都空，等下次
      this.lastCondition = undefined
      this.notifyChanged()
      return
    }

    // 确保输出端口的 valueClass 跟本次数据的具体类型对齐
    this.ensureOutputsMatch(data)

    // 两边都到齐 → 只 commit 命中的一路
    if (cond.value) {
      this.passOutput!.commit(data)
    } else {
      this.failOutput!.commit(data)
    }
    this.lastCondition = cond.value
    this.notifyChanged()
  }

  /**
   * 确保 passOutput / failOutput 的 valueClass 跟数据类型一致。
   * 上游数据类型变了就拆旧建新（旧端口连的下游边会一起断——跟 CodeNode 切返回类型同构）。
   *
   * 从 Value 实例取具体子类（e.g. StringValue / ImgFileValue），保证 downstream 的
   * canBindEdge 能正确放行（如 TextDisplayNode 只接 StringValue）。
   */
  private ensureOutputsMatch(data: Value): void {
    const DataCls = data.constructor as ValueClass
    // 如果两个输出都已经是这个类型 → 不用动
    if (
      this.passOutput !== undefined
      && this.failOutput !== undefined
      && this.passOutput.valueClass === DataCls
      && this.failOutput.valueClass === DataCls
    ) {
      return
    }
    this.rebuildOutputPorts(DataCls)
  }

  /** 按给定 valueClass 重建两个输出端口；拆旧建新，旧端口的下游边随 removeOutput 自动断开 */
  private rebuildOutputPorts(valueClass: ValueClass): void {
    if (this.passOutput !== undefined) {
      this.removeOutput(this.passOutput)
      this.passOutput = undefined
    }
    if (this.failOutput !== undefined) {
      this.removeOutput(this.failOutput)
      this.failOutput = undefined
    }
    this.passOutput = new OutputPort('pass', valueClass, {
      zh: '通过 →',
      en: 'Pass →',
      ja: '通過 →',
      ko: '통과 →',
      es: 'Pasa →',
      ar: 'يمر →',
      fr: 'Pass →',
      pt: 'Passa →',
      ru: 'Пропустить →',
      hi: 'पास →',
      id: 'Lolos →',
      de: 'Bestanden →',
      vi: 'Đạt →',
      tr: 'Geçti →',
      it: 'Supera →'
    })
    this.failOutput = new OutputPort('fail', valueClass, {
      zh: '驳回 →',
      en: 'Fail →',
      ja: '却下 →',
      ko: '반려 →',
      es: 'Rechaza →',
      ar: 'يُرفض →',
      fr: 'Rejet →',
      pt: 'Rejeita →',
      ru: 'Отклонить →',
      hi: 'अस्वीकार →',
      id: 'Tolak →',
      de: 'Abgelehnt →',
      vi: 'Từ chối →',
      tr: 'Reddet →',
      it: 'Rifiuta →'
    })
    this.addOutput(this.passOutput)
    this.addOutput(this.failOutput)
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    // 没有可配置字段；lastCondition 是派生态，恢复时上游一来就重算填上
    return {}
  }

  readState(_state: Record<string, unknown>): void {
    // 端口在构造函数里已经建好了，边接上后上游值一来就会触发重算
  }
}
