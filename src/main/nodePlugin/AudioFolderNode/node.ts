import { InputPort } from '../../engine/port/InputPort'
import { AudioFileCollectionValue } from '../../engine/data/AudioFileCollectionValue'
import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { FileCollectionNodeClass, FolderNode, type FileNodeClass } from '../FolderNode/node'
import { AudioFileNode } from '../AudioFileNode/node'

/**
 * 音频文件夹节点：结构与 FolderNode 一致（同一扁平 Scene 收养、局部坐标、DOM 嵌套渲染），
 * 但有两点不同：
 *
 * 1. **只收养音频节点**——节点拖入 / 文件拖入 / 端口收值三条入口都限制为音频，
 *    子节点恒为 AudioFileNode。
 * 2. **多了一个音频输出端口**——用户点击切换选中的那个音频文件，被选中音频的
 *    AudioFileValue 就从这个端口送出去（下游连边即可拿到「当前选中的音频」）。
 *
 * 选中态是本节点自己的内部状态（selectedChildId），与全局节点选中无关：
 * render.vue 在 pointerdown 捕获阶段命中子节点后调 selectChild() 切换。
 * 选中项变化（或选中音频内容被替换 / 异步读回）时把它的 fileOutput 值提交到
 * fileSelectOutput；没有选中项时调 fileSelectOutput.clear() 让下游清空。
 */
export class AudioFolderNode extends FolderNode {
  static readonly TYPE = 'audio-folder'
  readonly type: string = AudioFolderNode.TYPE

  /** 输入端口：只接受音频值（AudioFileValue），非音频类型的输出无法连入 */
  readonly fileInput = new InputPort('file', {
    accepts: [AudioFileValue],
    label: {
      zh: '音频',
      en: 'Audio',
      ja: '音声',
      ko: '오디오',
      es: 'Audio',
      ar: 'صوت',
      fr: 'Audio',
      pt: 'Áudio',
      ru: 'Аудио',
      hi: 'ऑडियो',
      id: 'Audio',
      de: 'Audio',
      vi: 'Âm thanh',
      tr: 'Ses',
      it: 'Audio'
    }
  })

  /** 收纳范围：只接受音频文件节点 */
  protected readonly acceptedFileNodeClasses: readonly FileNodeClass[] = [AudioFileNode]

  /** 音频输出端口：当前选中子音频的 AudioFileValue */
  readonly fileSelectOutput = new OutputPort('file-select', AudioFileValue, {
    zh: '选中音频',
    en: 'Selected Audio',
    ja: '選択した音声',
    ko: '선택한 오디오',
    es: 'Audio seleccionado',
    ar: 'الصوت المحدد',
    fr: 'Audio sélectionné',
    pt: 'Áudio selecionado',
    ru: 'Выбранное аудио',
    hi: 'चयनित ऑडियो',
    id: 'Audio Terpilih',
    de: 'Ausgewähltes Audio',
    vi: 'Âm thanh đã chọn',
    tr: 'Seçili Ses',
    it: 'Audio selezionato'
  })

  readonly FileCollectionNodeClasses: FileCollectionNodeClass = AudioFileCollectionValue

  /** 集合输出端口：全部子音频组成的 AudioFileCollectionValue */
  readonly collectionOutput = new OutputPort('collection', this.FileCollectionNodeClasses, {
    zh: '全部音频',
    en: 'All Audio',
    ja: 'すべての音声',
    ko: '모든 오디오',
    es: 'Todo el audio',
    ar: 'جميع الأصوات',
    fr: 'Tous les audios',
    pt: 'Todo áudio',
    ru: 'Всё аудио',
    hi: 'सभी ऑडियो',
    id: 'Semua Audio',
    de: 'Alle Audios',
    vi: 'Tất cả âm thanh',
    tr: 'Tüm Sesler',
    it: 'Tutto l’audio'
  })

  constructor(id: string) {
    super(id)
    this.addInput(this.fileInput)
    this.addOutput(this.fileSelectOutput)
    this.addOutput(this.collectionOutput)
  }
}
