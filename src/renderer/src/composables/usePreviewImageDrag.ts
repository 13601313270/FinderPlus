import { workspaceScene } from '../../../main/engine/graph/SceneRegistry'
import { ImgFileNode } from '../../../main/nodePlugin/ImgFileNode/node'
import { screenToWorld, getCanvasContainer } from '@renderer/canvas/viewport'
import { setLastDragPath } from '@renderer/composables/useFileDragOut'

/** 新建 ImgFileNode 时的唯一 ID */
function generateNodeId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/** 越界确认延迟 ms，给用户 300ms 反悔窗口 */
const CONFIRM_DELAY_MS = 300

/** 判断 pointer 是否越出浏览器视口 */
function isOutOfWindow(e: PointerEvent): boolean {
  return (
    e.clientX < 0 ||
    e.clientY < 0 ||
    e.clientX > window.innerWidth ||
    e.clientY > window.innerHeight
  )
}

interface PreviewImageDragResult {
  /** 预览图 pointerdown 直接绑这个，内部 stopPropagation 拦截冒泡 */
  startImageDrag: (e: PointerEvent) => void
  /** 节点卸载时 cleanup document 级监听和定时器 */
  cleanup: () => void
}

/**
 * ImagePreviewNode 的预览图专属拖拽逻辑。
 *
 * 和 useNodePosition 的分工：
 * - useNodePosition 绑在卡片容器的 pointerdown 上 → 拖拽**整个节点**移动位置
 * - usePreviewImageDrag 绑在**预览图**的 pointerdown 上 → stopPropagation 拦截事件，
 *   不冒泡到卡片容器，所以节点本体不动；拖拽预览图的行为由这里单独处理：
 *
 *   1. 画布内松手 → 落点新建 ImgFileNode（File → writeBuffer 落盘 → setFile → addNode）
 *   2. 越出窗口 300ms → writeBuffer 落盘 → startDrag 交给 OS（拖到桌面/文件夹）
 *
 * 为什么要先 writeBuffer？ImgFileValue.file 是内存里的 File 对象，
 * startDrag 只接受画布目录下已存在的文件名，所以必须先落盘一份再拖。
 * 同理，新建 ImgFileNode 也需要 fileName（它的 setFile 签名是 fileName + size）。
 *
 * 画布容器引用直接从 viewport.canvasContainerEl 取——App.vue onMounted 时注入，
 * 跟 viewport 单例同样的模式，不需要层层 prop 传。
 */
export function usePreviewImageDrag(
  /** 返回当前预览的 File 对象；无输入时返回 undefined */
  getFile: () => File | undefined
): PreviewImageDragResult {
  let dragging = false
  /** 越界确认定时器 */
  let dragOutTimer: ReturnType<typeof setTimeout> | undefined
  /** startDrag 已经被调用过（OS 级拖拽进行中） */
  let osDragStarted = false

  /** pointermove 监听函数（需要引用以便 removeEventListener） */
  let onMove: ((e: PointerEvent) => void) | null = null
  /** pointerup 监听函数 */
  let onUp: ((e: PointerEvent) => void) | null = null

  function clearDragOutTimer(): void {
    if (dragOutTimer) {
      clearTimeout(dragOutTimer)
      dragOutTimer = undefined
    }
  }

  /** File 对象 → base64 字符串 */
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const comma = result.indexOf(',')
        resolve(comma >= 0 ? result.slice(comma + 1) : result)
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  /** 越界超时：writeBuffer → startDrag 交给 OS */
  async function doStartDrag(): Promise<void> {
    const file = getFile()
    if (!file) return
    const base64 = await fileToBase64(file)
    const written = await window.fileApi.writeBuffer(file.name, base64)
    // startDrag 返回的 fullPath 必须存入同一处，让 App.vue 的 isSelfDragDrop 能识别
    // （OS 拖拽回来时不会再创建重复的 ImgFileNode）
    const fullPath = await window.fileApi.startDrag(written.fileName)
    setLastDragPath(fullPath)
  }

  /** 画布内松手：writeBuffer → 新建 ImgFileNode → addNode → 直接固定在落点 */
  async function doCreateImgFileNode(clientX: number, clientY: number): Promise<void> {
    const file = getFile()
    const canvasEl = getCanvasContainer()
    if (!file || !canvasEl) return

    const rect = canvasEl.getBoundingClientRect()
    const [wx, wy] = screenToWorld(clientX - rect.left, clientY - rect.top)

    const base64 = await fileToBase64(file)
    const written = await window.fileApi.writeBuffer(file.name, base64)

    const node = new ImgFileNode(generateNodeId(ImgFileNode.TYPE))
    node.setPosition(wx, wy)
    node.setFile(written.fileName, written.size)
    workspaceScene.addNode(node)
  }

  function cleanupListeners(): void {
    dragging = false
    clearDragOutTimer()
    if (onMove) {
      window.removeEventListener('pointermove', onMove)
      onMove = null
    }
    if (onUp) {
      window.removeEventListener('pointerup', onUp)
      onUp = null
    }
  }

  function startImageDrag(e: PointerEvent): void {
    const file = getFile()
    if (!file) return // 没有可拖的内容

    e.stopPropagation() // 关键：阻止冒泡到卡片容器，节点本体不移动
    e.preventDefault()

    dragging = true
    osDragStarted = false

    onMove = (ev: PointerEvent) => {
      if (!dragging) return

      const out = isOutOfWindow(ev)

      if (out) {
        // 第一次越界才开定时器
        if (!dragOutTimer) {
          dragOutTimer = setTimeout(() => {
            dragOutTimer = undefined
            osDragStarted = true
            cleanupListeners()
            doStartDrag() // 不 await，让 OS 拖拽接管
          }, CONFIRM_DELAY_MS)
        }
        return // 越界期间等定时器到期
      }

      // 回到窗口内：清掉越界定时器
      if (dragOutTimer) {
        clearDragOutTimer()
      }
    }

    onUp = (ev: PointerEvent) => {
      cleanupListeners()

      // OS 拖拽已触发：pointerup 只是 OS 拖拽过程中的事件，不处理
      if (osDragStarted) {
        osDragStarted = false
        return
      }

      // 画布内松手 → 新建 ImgFileNode
      doCreateImgFileNode(ev.clientX, ev.clientY)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const cleanup = (): void => {
    cleanupListeners()
  }

  return { startImageDrag, cleanup }
}
