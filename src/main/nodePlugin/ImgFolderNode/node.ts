import type { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'
import type { Scene } from '../../engine/graph/Scene'
import { ImgFileCollectionValue } from '../../engine/data/ImgFileCollectionValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { MethodPort } from '../../engine/port/MethodPort'
import { NumberValue } from '../../engine/data/NumberValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { FolderNode } from '../FolderNode/node'
import { ImgFileNode } from '../ImgFileNode/node'

/** 取文件名后缀（含点、小写）；无扩展名返回空串 */
function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

/**
 * 图片文件夹节点：结构与 FolderNode 一致（同一扁平 Scene 收养、局部坐标、DOM 嵌套渲染），
 * 但有两点不同：
 *
 * 1. **只收养图片节点**——节点拖入 / 文件拖入 / 端口收值三条入口都限制为图片，
 *    子节点恒为 ImgFileNode。
 * 2. **多了一个图片输出端口**——用户点击切换选中的那张图片，被选中图片的
 *    ImgFileValue 就从这个端口送出去（下游连边即可拿到「当前选中的图」）。
 *
 * 选中态是本节点自己的内部状态（selectedChildId），与全局节点选中无关：
 * render.vue 在 pointerdown 捕获阶段命中子节点后调 selectChild() 切换。
 * 选中项变化（或选中图片内容被替换 / 异步读回）时把它的 fileOutput 值提交到
 * imageOutput；没有选中项时调 imageOutput.clear() 让下游清空。
 */
export class ImgFolderNode extends FolderNode {
  static readonly TYPE = 'img-folder'
  readonly type: string = ImgFolderNode.TYPE

  /** 图片输出端口：当前选中子图片的 ImgFileValue */
  readonly imageOutput = new OutputPort('image', ImgFileValue, {
    zh: '选中图片',
    en: 'Selected Image',
    ja: '選択した画像',
    ko: '선택한 이미지',
    es: 'Imagen seleccionada',
    ar: 'الصورة المحددة',
    fr: 'Image sélectionnée',
    pt: 'Imagem selecionada',
    ru: 'Выбранное изображение',
    hi: 'चयनित छवि',
    id: 'Gambar Terpilih',
    de: 'Ausgewähltes Bild',
    vi: 'Ảnh đã chọn',
    tr: 'Seçili Görüntü',
    it: 'Immagine selezionata'
  })

  /** 集合输出端口：全部子图片组成的 ImgFileCollectionValue */
  readonly collectionOutput = new OutputPort('collection', ImgFileCollectionValue, {
    zh: '全部图片',
    en: 'All Images',
    ja: 'すべての画像',
    ko: '모든 이미지',
    es: 'Todas las imágenes',
    ar: 'جميع الصور',
    fr: 'Toutes les images',
    pt: 'Todas as imagens',
    ru: 'Все изображения',
    hi: 'सभी छवियां',
    id: 'Semua Gambar',
    de: 'Alle Bilder',
    vi: 'Tất cả ảnh',
    tr: 'Tüm Görseller',
    it: 'Tutte le immagini'
  })

  /** 数量输出端口：当前文件夹内的图片张数（NumberValue） */
  readonly countOutput = new OutputPort('count', NumberValue, {
    zh: '图片数量',
    en: 'Image Count',
    ja: '画像数',
    ko: '이미지 수',
    es: 'Cantidad de imágenes',
    ar: 'عدد الصور',
    fr: 'Nombre d\'images',
    pt: 'Quantidade de imagens',
    ru: 'Количество изображений',
    hi: 'छवियों की संख्या',
    id: 'Jumlah Gambar',
    de: 'Bildanzahl',
    vi: 'Số lượng ảnh',
    tr: 'Görsel Sayısı',
    it: 'Numero di immagini'
  })

  /** 所有子节点 onChanged 订阅清理函数集合，collection 输出重算依赖它 */
  private readonly childSubs = new Set<() => void>()

  /** 方法端口：外部连线触发清空全部子图片 */
  private readonly clearPort = new MethodPort('clear', {
    label: {
      zh: '清空',
      en: 'Clear',
      ja: 'クリア',
      ko: '비우기',
      es: 'Limpiar',
      ar: 'مسح',
      fr: 'Vider',
      pt: 'Limpar',
      ru: 'Очистить',
      hi: 'साफ़ करें',
      id: 'Hapus',
      de: 'Leeren',
      vi: 'Xóa',
      tr: 'Temizle',
      it: 'Cancella'
    }
  })

  /** 当前选中的子节点 id；空串表示未选中 */
  private selectedChildIdValue = ''

  /** 选中子节点的 onChanged 订阅：选中图片内容变化（异步读回 / 被替换）时重提值 */
  private selectedChildUnsub?: () => void

  /** 持久化期间暂存的待恢复选中 id（readState 存、adoptChildren 收尾时应用） */
  private pendingSelectedChildId = ''

  constructor(id: string) {
    super(id)
    this.addOutput(this.imageOutput)
    this.addOutput(this.collectionOutput)
    this.addOutput(this.countOutput)
    this.addMethod(this.clearPort)
    this.clearPort.onTrigger(() => this.clearAll())
  }

  /** 当前选中的子节点 id；空串表示未选中 */
  get selectedChildId(): string {
    return this.selectedChildIdValue
  }

  // —— 选中 / 输出 ——

  /**
   * 切换到指定子节点（必须是本文件夹已收养的图片节点）。
   * 切换后重订阅该子节点、重新提交输出值并通知 UI 刷新选中高亮。
   */
  selectChild(id: string): void {
    if (id === this.selectedChildIdValue) return
    const child = this.children.find((c) => c.id === id)
    if (!(child instanceof ImgFileNode)) return
    this.selectedChildIdValue = id
    this.resubscribeSelected(child)
    this.commitSelected()
    this.notifyChanged()
  }

  /** 订阅当前选中子节点的变化；切换 / 释放时先退订旧的 */
  private resubscribeSelected(child: Node | undefined): void {
    this.selectedChildUnsub?.()
    this.selectedChildUnsub = undefined
    if (child) {
      this.selectedChildUnsub = child.onChanged(() => this.commitSelected())
    }
  }

  /** 把选中子图片的 fileOutput 值提交到 imageOutput；无有效值则清空下游 */
  private commitSelected(): void {
    const child = this.children.find((c) => c.id === this.selectedChildIdValue)
    const value = child instanceof ImgFileNode ? child.fileOutput.value : undefined
    if (value instanceof ImgFileValue) {
      this.imageOutput.commit(value)
    } else {
      this.imageOutput.clear()
    }
  }

  /**
   * 订阅所有当前子节点的变化（先清理旧订阅）。
   * 子节点 fileOutput 变化时 → commitCollection() 重算集合输出。
   */
  private resubscribeAllChildren(): void {
    this.childSubs.forEach(unsub => unsub())
    this.childSubs.clear()
    for (const child of this.children) {
      if (child instanceof ImgFileNode) {
        const unsub = child.onChanged(() => this.commitCollection())
        this.childSubs.add(unsub)
      }
    }
  }

  /**
   * 构造 ImgFileCollectionValue 并 commit 到 collectionOutput。
   * 所有子节点的 fileOutput.value 收集起来；没有子节点则 commit null 值。
   */
  private commitCollection(): void {
    if (this.children.length === 0) {
      this.collectionOutput.commit(new ImgFileCollectionValue())
      return
    }
    const items: ImgFileValue[] = []
    for (const child of this.children) {
      if (!(child instanceof ImgFileNode)) continue
      const v = child.fileOutput.value
      if (v instanceof ImgFileValue && !v.isNull) {
        items.push(v)
      }
    }
    this.collectionOutput.commit(new ImgFileCollectionValue(items))
  }

  /** 把当前 children 数量 commit 到 countOutput */
  private commitCount(): void {
    this.countOutput.commit(new NumberValue(this.children.length))
  }

  // —— 收养入口收紧为「仅图片」 ——

  /** 只收养图片节点；首个被收养的子节点自动选中 */
  override adoptNode(child: Node): void {
    if (!(child instanceof ImgFileNode)) return
    super.adoptNode(child)
    if (!this.selectedChildIdValue) {
      this.selectChild(child.id)
    }
    this.resubscribeAllChildren()
    this.commitCollection()
    this.commitCount()
  }

  /** 端口收值：只接受图片值，其余走超类流程会产生非图片子节点，直接拦截 */
  override async inputPortReceiveValue(ports: InputPort[]): Promise<void> {
    const [first] = this.fileInput.value
    if (!(first instanceof ImgFileValue)) return
    await super.inputPortReceiveValue(ports)
  }

  /** 文件拖入：仅图片后缀才继续（超类会复制文件并构造对应的文件子节点） */
  override async onFileDrop(sourcePath: string): Promise<void> {
    if (!ImgFileNode.acceptsExtension(extOf(sourcePath))) return
    await super.onFileDrop(sourcePath)
  }

  /** 节点拖入：只接受图片节点（超类判定为「未被收养的文件节点」） */
  override isPositionAcceptNodeDrop(source: Node): boolean {
    if (!(source instanceof ImgFileNode)) return false
    return super.isPositionAcceptNodeDrop(source)
  }

  /** 释放子节点：若释放的正是选中项，退订并回退到下一个子节点（没有则清空输出） */
  override removeChild(child: Node): void {
    super.removeChild(child)
    if (child.id !== this.selectedChildIdValue) {
      this.resubscribeAllChildren()
      this.commitCollection()
      this.commitCount()
      return
    }
    this.selectedChildIdValue = ''
    this.resubscribeSelected(undefined)
    const next = this.children[0]
    if (next) {
      this.selectChild(next.id)
    } else {
      this.imageOutput.clear()
      this.notifyChanged()
    }
    this.resubscribeAllChildren()
    this.commitCollection()
    this.commitCount()
  }

  // —— 清空 ——

  /**
   * 清空全部子图片节点（彻底 destroy，不是释放回画布）。
   * 选中态、输出值、fingerprint 映射、集合输出一并清理。
   */
  clearAll(): void {
    const scene = this.sceneRef
    if (!scene || this.children.length === 0) return
    // 用副本遍历，因为 scene.removeNode → removeChild 会 splice children
    const snapshot = [...this.children]
    for (const child of snapshot) {
      void scene.removeNode(child)
    }
    this.selectedChildIdValue = ''
    this.resubscribeSelected(undefined)
    this.imageOutput.clear()
    this.resubscribeAllChildren()
    this.commitCollection()
    this.commitCount()
    // 清 fingerprint 映射（父类的属性子类直接访问）
    // @ts-ignore — fingerprintToChild 是 FolderNode private，这里用下标签名绕过
    const fpMap: Map<string, Node> = (this as unknown as { fingerprintToChild: Map<string, Node> }).fingerprintToChild
    fpMap.clear()
    this.notifyChanged()
  }

  // —— 持久化 ——

  override saveState(): Record<string, unknown> {
    return { ...super.saveState(), selectedChildId: this.selectedChildIdValue }
  }

  override readState(state: Record<string, unknown>): void {
    super.readState(state)
    const selected = state.selectedChildId
    this.pendingSelectedChildId = typeof selected === 'string' ? selected : ''
  }

  /** 恢复收尾：先收养子节点，再应用暂存的选中项（无效则回退到第一个子节点） */
  override adoptChildren(scene: Scene): void {
    super.adoptChildren(scene)
    const wanted = this.children.find((c) => c.id === this.pendingSelectedChildId)
    const target = wanted ?? this.children[0]
    if (target) this.selectChild(target.id)
    this.pendingSelectedChildId = ''
    this.resubscribeAllChildren()
    this.commitCollection()
    this.commitCount()
  }

  override async beforeDestroy(): Promise<void> {
    this.resubscribeSelected(undefined)
    this.childSubs.forEach(unsub => unsub())
    this.childSubs.clear()
    await super.beforeDestroy()
  }
}