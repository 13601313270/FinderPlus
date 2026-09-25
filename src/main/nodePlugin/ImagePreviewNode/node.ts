import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/**
 * 图片预览节点：接收 ImgFileValue，渲染预览，同时透传到输出端口。
 *
 * 只有一个输入端口（accepts: [ImgFileValue]），只有一个输出端口（ImgFileValue 透传）。
 * 拖拽预览图的特殊交互在 render.vue + usePreviewImageDrag 里处理：
 * - 画布内松手 → 新建 ImgFileNode 并进入跟随模式
 * - 越出窗口 → 写画布目录 + startDrag 交给 OS
 *
 * 与 FileInfoNode 类似是"派生展示节点"——自身不持久化任何业务状态，
 * saveState 返回空对象，恢复全靠上游 commit 重走一遍。
 */
export class ImagePreviewNode extends Node {
  static readonly TYPE = 'image-preview'
  readonly type = ImagePreviewNode.TYPE

  /** 输入端口：只接 ImgFileValue（精确类型，不接 FileValue 其他子类） */
  readonly imageInput = new InputPort('image', { accepts: [ImgFileValue], label: '图片' })

  /** 输出端口：ImgFileValue 透传 */
  readonly imageOutput = new OutputPort('image', ImgFileValue, '图片')

  constructor(id: string) {
    super(id)
    this.addInput(this.imageInput)
    this.addOutput(this.imageOutput)
    // 内容区硬约束：16:10 预览区 + 可选底部信息栏。信息栏出现时若超出，在框内裁剪
    this.setBox(240, 196)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(relativeX: number, relativeY: number): boolean {
    return true
  }

  onFileDrop(sourcePath: string): void {
    // 本节点不接收文件，不处理
    alert('本节点不接收外部文件' + sourcePath)
  }

  /**
   * 上游值变化：取第一个 ImgFileValue 透传到输出端口；
   * 无输入时必须调 imageOutput.clear() 沿 edges 派发清空信号——
   * 否则下游的 incoming map 里还残留旧值，级联链路就断了。
   */
  onInputChanged(): void {
    const [first] = this.imageInput.value
    if (first instanceof ImgFileValue) {
      this.imageOutput.commit(first)
    } else {
      this.imageOutput.clear()
    }
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    return {}
  }

  readState(_state: Record<string, unknown>): void {
    // 啥也不做——上游恢复后自然会 commit
  }
}
