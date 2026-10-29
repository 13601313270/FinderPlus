import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { AudioFileValue } from '../../engine/data/AudioFileValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import { FileNode } from '../FileNode/node'
import { inferAudioMime } from './mime'

/** 音频文件后缀集合 */
const ACCEPTED_EXTS = new Set([
  '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.webm', '.opus'
])

export class AudioFileNode extends FileNode {
  static readonly TYPE = 'audio-file'

  static override acceptsExtension(ext: string): boolean {
    return ACCEPTED_EXTS.has(ext)
  }

  readonly type = AudioFileNode.TYPE

  /** 文件输出（AudioFileValue，kind = 'audio-file'） */
  readonly fileOutput = new OutputPort('file', AudioFileValue, {
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

  /** 文件数据输入端口：只接受同类型音频文件 */
  readonly fileInput = new InputPort('file-in', {
    accepts: [AudioFileValue],
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
    this.setBox(140, 150)
  }

  /**
   * 画布启动就绪时：先调基类注册文件系统监听，再主动读一次磁盘文件
   * commit fileOutput——确保节点即使处于 minimized 状态（render.vue 不渲染、watch 不触发），
   * 下游连边也能拿到值。durationOutput 仍需等 render.vue 的 audio loadedmetadata 回写。
   */
  override onReady(): void {
    super.onReady()
    if (this.fileNameValue) {
      void this.reloadFileContent()
    }
  }

  /** 文件被替换后：重读二进制并 commit fileOutput */
  override async reloadFileContent(): Promise<void> {
    if (!this.fileName) return
    try {
      // @ts-ignore
      const base64 = await window.fileApi.readBinary(this.fileName)
      this.setContent(base64)
    } catch (err) {
      console.warn('[AudioFileNode] 读取替换后的文件失败：', this.fileName, err)
    }
  }

  /**
   * 写入音频二进制并 commit fileOutput；同时用 Web Audio API 异步解码时长，
   * 解码成功后 commit durationOutput——即使节点处于 minimized 状态（render.vue 不渲染）
   * 也能让下游拿到时长。render.vue 的 audio loadedmetadata 仍可通过 commitDuration 回写覆盖。
   */
  setContent(base64: string): void {
    if (!this.fileName) return
    const mime = inferAudioMime(this.fileName)
    const bytes = base64ToBytes(base64)
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const file = new File([ab], this.fileName, { type: mime })
    const hash = djb2(base64)
    this.fileOutput.commit(new AudioFileValue(file, hash))
    this.notifyChanged()
    // 异步解码时长：fire-and-forget，失败不影响 fileOutput 已 commit 的值
    void this.decodeAndCommitDuration(ab)
  }

  /** 用 Web Audio API 解码 ArrayBuffer，拿到时长后 commit durationOutput */
  private async decodeAndCommitDuration(ab: ArrayBuffer): Promise<void> {
    try {
      const ctx = new AudioContext()
      try {
        const audioBuffer = await ctx.decodeAudioData(ab.slice(0))
        const seconds = Number(audioBuffer.duration.toFixed(3))
        if (seconds > 0 && isFinite(seconds)) {
          this.durationOutput.commit(new NumberValue(seconds))
          this.notifyChanged()
        }
      } finally {
        await ctx.close()
      }
    } catch (err) {
      console.warn('[AudioFileNode] 解码音频时长失败：', this.fileName, err)
    }
  }

  /** 展示用格式名 */
  get displayFormat(): string {
    const mime = this.fileName ? inferAudioMime(this.fileName) : ''
    const map: Record<string, string> = {
      'audio/mpeg': 'MP3',
      'audio/wav': 'WAV',
      'audio/ogg': 'OGG',
      'audio/mp4': 'M4A',
      'audio/flac': 'FLAC',
      'audio/aac': 'AAC',
      'audio/webm': 'WebM',
      'audio/opus': 'Opus'
    }
    return map[mime] ?? mime
  }

  /** 当前音频 MIME */
  get audioType(): string {
    return this.fileName ? inferAudioMime(this.fileName) : ''
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void { /* 不处理 */ }
}
