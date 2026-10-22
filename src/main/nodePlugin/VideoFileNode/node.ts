import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { VideoFileValue } from '../../engine/data/VideoFileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { FileNode } from '../FileNode/node'
import { inferVideoMime } from './mime'

/** 视频文件后缀集合（不含 .ogg/.webm——AudioFileNode 已声明，且排在前面，拖入会被它抢走） */
const ACCEPTED_EXTS = new Set([
  '.mp4', '.mov', '.m4v', '.avi', '.mkv', '.flv', '.wmv', '.3gp', '.ts', '.mts', '.m2ts', '.hevc'
])

export class VideoFileNode extends FileNode {
  static readonly TYPE = 'video-file'

  static override acceptsExtension(ext: string): boolean {
    return ACCEPTED_EXTS.has(ext)
  }

  readonly type = VideoFileNode.TYPE

  /** 文件输出（VideoFileValue） */
  readonly fileOutput = new OutputPort('file', VideoFileValue, {
    zh: '文件',
    en: 'File',
    ja: 'ファイル',
    ko: '파일',
    es: 'Archivo',
    ar: 'ملف',
    fr: 'Fichier',
    pt: 'Ficheiro',
    ru: 'Файл',
    hi: 'फ़ाइल',
    id: 'Berkas',
    de: 'Datei',
    vi: 'Tệp',
    tr: 'Dosya',
    it: 'File'
  })

  /** 时长输出（秒） */
  readonly durationOutput = new OutputPort('duration', NumberValue, {
    zh: '时长（秒）',
    en: 'Duration (s)',
    ja: '長さ（秒）',
    ko: '길이 (초)',
    es: 'Duración (s)',
    ar: 'المدة (ث)',
    fr: 'Durée (s)',
    pt: 'Duração (s)',
    ru: 'Длительность (с)',
    hi: 'अवधि (स)',
    id: 'Durasi (dtk)',
    de: 'Dauer (s)',
    vi: 'Thời lượng (s)',
    tr: 'Süre (s)',
    it: 'Durata (s)'
  })

  /** 文件数据输入端口：只接受同类型视频文件 */
  readonly fileInput = new InputPort('file-in', {
    accepts: [VideoFileValue],
    label: {
      zh: '写入数据',
      en: 'Write Data',
      ja: 'データを書き込む',
      ko: '데이터 쓰기',
      es: 'Escribir datos',
      ar: 'كتابة البيانات',
      fr: 'Écrire des données',
      pt: 'Gravar dados',
      ru: 'Запись данных',
      hi: 'डेटा लिखें',
      id: 'Tulis Data',
      de: 'Daten schreiben',
      vi: 'Ghi dữ liệu',
      tr: 'Veri yaz',
      it: 'Scrivi dati'
    }
  })

  /** 方法端口：上游 commit 任意值即触发一次播放（从头开始） */
  readonly playPort = new MethodPort('play', {
    label: {
      zh: '播放',
      en: 'Play',
      ja: '再生',
      ko: '재생',
      es: 'Reproducir',
      ar: 'تشغيل',
      fr: 'Lecture',
      pt: 'Reproduzir',
      ru: 'Воспроизвести',
      hi: 'चलाएँ',
      id: 'Putar',
      de: 'Abspielen',
      vi: 'Phát',
      tr: 'Oynat',
      it: 'Riproduci'
    }
  })

  /** MethodPort play 触发 → 递增此序号；render.vue 比对序号变化后执行 DOM 播放 */
  private playRequestSeq = 0

  /** render.vue 消费序号，与上次比对判断是否需要从头播放 */
  consumePlayRequestSeq(): number {
    return this.playRequestSeq
  }

  constructor(id: string) {
    super(id)
    this.addOutput(this.fileOutput)
    this.addOutput(this.durationOutput)
    this.addOutput(this.pathOutput)
    this.addMethod(this.playPort)
    this.playPort.onTrigger(() => {
      this.playRequestSeq += 1
      this.notifyChanged()
    })
    this.bindFileInput(this.fileInput)
    this.setBox(220, 200)
  }

  /** 文件被替换后：重读二进制并 commit fileOutput */
  override async reloadFileContent(): Promise<void> {
    if (!this.fileName) return
    try {
      // @ts-ignore
      const base64 = await window.fileApi.readBinary(this.fileName)
      this.setContent(base64)
    } catch (err) {
      console.warn('[VideoFileNode] 读取替换后的文件失败：', this.fileName, err)
    }
  }

  /**
   * 写入视频二进制并 commit fileOutput。
   * 时长由 render.vue 在 video loadedmetadata 时通过 commitDuration 回写
   * （浏览器能解任何格式，比自己写文件头解析靠谱得多）。
   */
  setContent(base64: string): void {
    if (!this.fileName) return
    const mime = inferVideoMime(this.fileName)
    const bytes = base64ToBytes(base64)
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const file = new File([ab], this.fileName, { type: mime })
    const hash = djb2(base64)
    this.fileOutput.commit(new VideoFileValue(file, hash))
    this.notifyChanged()
  }

  /** 展示用格式名 */
  get displayFormat(): string {
    const mime = this.fileName ? inferVideoMime(this.fileName) : ''
    const map: Record<string, string> = {
      'video/mp4': 'MP4',
      'video/webm': 'WebM',
      'video/ogg': 'OGG',
      'video/quicktime': 'MOV',
      'video/x-m4v': 'M4V',
      'video/x-msvideo': 'AVI',
      'video/x-matroska': 'MKV',
      'video/x-flv': 'FLV',
      'video/x-ms-wmv': 'WMV',
      'video/3gpp': '3GP',
      'video/mp2t': 'TS',
      'video/hevc': 'HEVC'
    }
    return map[mime] ?? mime
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void { /* 不处理 */ }

  /** 由 render.vue 在 video loadedmetadata 时调：用浏览器解码出的真实时长回写 durationOutput */
  commitDuration(seconds: number): void {
    this.durationOutput.commit(new NumberValue(seconds))
    this.notifyChanged()
  }
}
