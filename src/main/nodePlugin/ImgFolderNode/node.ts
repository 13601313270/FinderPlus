import { InputPort } from '../../engine/port/InputPort'
import { ImgFileCollectionValue } from '../../engine/data/ImgFileCollectionValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { FileCollectionNodeClass, FolderNode, type FileNodeClass } from '../FolderNode/node'
import { ImgFileNode } from '../ImgFileNode/node'

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
 * fileSelectOutput；没有选中项时调 fileSelectOutput.clear() 让下游清空。
 */
export class ImgFolderNode extends FolderNode {
  static readonly TYPE = 'img-folder'
  readonly type: string = ImgFolderNode.TYPE

  /** 输入端口：只接受图片值（ImgFileValue），非图片类型的输出无法连入 */
  readonly fileInput = new InputPort('file', {
    accepts: [ImgFileValue],
    label: {
      zh: '图片',
      en: 'Image',
      ja: '画像',
      ko: '이미지',
      es: 'Imagen',
      ar: 'صورة',
      fr: 'Image',
      pt: 'Imagem',
      ru: 'Изображение',
      hi: 'छवि',
      id: 'Gambar',
      de: 'Bild',
      vi: 'Ảnh',
      tr: 'Görüntü',
      it: 'Immagine'
    }
  })

  /** 收纳范围：只接受图片文件节点 */
  protected readonly acceptedFileNodeClasses: readonly FileNodeClass[] = [ImgFileNode]

  /** 图片输出端口：当前选中子图片的 ImgFileValue */
  readonly fileSelectOutput = new OutputPort('file-select', ImgFileValue, {
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

  readonly FileCollectionNodeClasses: FileCollectionNodeClass = ImgFileCollectionValue

  /** 集合输出端口：全部子图片组成的 ImgFileCollectionValue */
  readonly collectionOutput = new OutputPort('collection', this.FileCollectionNodeClasses, {
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

  constructor(id: string) {
    super(id)
    this.addInput(this.fileInput)
    this.addOutput(this.fileSelectOutput)
    this.addOutput(this.collectionOutput)
  }
}