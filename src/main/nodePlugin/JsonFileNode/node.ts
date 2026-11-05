import { bytesToBase64 } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { JsonFileValue } from '../../engine/data/JsonFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { StringValue } from '../../engine/data/StringValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { InputPort } from '../../engine/port/InputPort'
import { FileNode } from '../FileNode/node'

/**
 * JSON 文件节点：选中 .json 文件后由渲染端读取内容，节点负责持有内容并从多个输出端口送出。
 *
 * - jsonOutput：解析后的<b>结构化 JSON 对象</b>（JsonValue），下游接 json 类型的节点可直接取用
 * - rawOutput：原始 JSON 文本（string），下游接 string 的节点能直接接上
 * - fileOutput：JsonFileValue（FileValue 子类，kind = 'json-file'），
 *   下游接 'json-file' 或 'file' 类型的节点都能连上
 * - pathOutput：文件绝对路径（string），基类 FileNode 共用
 *
 * 解析失败时（非法 JSON），jsonOutput 会 commit isNull=true 的 JsonValue，
 * 但 rawOutput 仍正常 commit 原始文本——下游可自行决定是否处理。
 */
export class JsonFileNode extends FileNode {
  static readonly TYPE = 'json-file'

  static override acceptsExtension(ext: string): boolean {
    return ext === '.json'
  }

  readonly type = JsonFileNode.TYPE

  /** 结构化 JSON 对象输出 */
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

  /** 原始文本输出（string） */
  readonly rawOutput = new OutputPort('raw', StringValue, {
    zh: '文本',
    en: 'Raw',
    ja: 'テキスト',
    ko: '텍스트',
    es: 'Texto',
    ar: 'نص',
    fr: 'Texte',
    pt: 'Texto',
    ru: 'Текст',
    hi: 'टेक्स्ट',
    id: 'Teks',
    de: 'Text',
    vi: 'Văn bản',
    tr: 'Metin',
    it: 'Testo'
  })

  /** 文件输出（JsonFileValue，kind = 'json-file'） */
  readonly fileOutput = new OutputPort('file', JsonFileValue, {
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

  /** 文件数据输入端口：只接受同类型（json）文件，收到值即替换本节点文件 */
  readonly fileInput = new InputPort('file-in', {
    accepts: [JsonFileValue],
    label: {
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
    }
  })

  /** JSON 文本输入端口：接收字符串，写入节点内容并同步到磁盘文件 */
  readonly rawInput = new InputPort('raw-in', {
    accepts: [StringValue],
    label: {
      zh: '文本',
      en: 'Raw',
      ja: 'テキスト',
      ko: '텍스트',
      es: 'Texto',
      ar: 'نص',
      fr: 'Texte',
      pt: 'Texto',
      ru: 'Текст',
      hi: 'टेक्स्ट',
      id: 'Teks',
      de: 'Text',
      vi: 'Văn bản',
      tr: 'Metin',
      it: 'Testo'
    }
  })

  /** 结构化 JSON 对象输入端口：接收 JsonValue，序列化后写入节点并落盘 */
  readonly jsonInput = new InputPort('json-in', {
    accepts: [JsonValue],
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

  /** 当前 JSON 原始文本；空节点初始化为空串 */
  private contentValue = ''

  constructor(id: string) {
    super(id)
    this.addOutput(this.jsonOutput)
    this.addOutput(this.rawOutput)
    this.addOutput(this.fileOutput)
    // 基类共用的路径端口（文件绝对路径），挂在末尾
    this.addOutput(this.pathOutput)
    this.bindFileInput(this.fileInput)
    this.addInput(this.rawInput)
    this.addInput(this.jsonInput)
    // 内容区硬约束：文件图标 72px + 文件名行 + padding ≈ 122px 高，宽 180px
    this.setBox(180, 122)
  }

  /** 画布启动就绪时：先注册基类的文件变化监听，再做启动补读 */
  override async onReady(): Promise<void> {
    // 基类注册文件系统变化监听（外部编辑器改文件 → 自动调 reloadFileContent）
    super.onReady()
    // 补读：有 fileName 但 content 没从 DB 恢复回来时，从磁盘读一次
    if (this.fileName && !this.contentValue) {
      try {
        // @ts-ignore — 只在 renderer 里执行，window.fileApi 一定存在
        const text = await window.fileApi.readText(this.fileName)
        this.setContent(text)
      } catch (err) {
        // 文件可能已被用户删了，静默忽略——节点本身正常展示
        console.warn('[JsonFileNode] 启动时读文件失败：', this.fileName, err)
      }
    }
  }

  /** 文件被输入端口替换后：重读新文件内容并 commit 端口 */
  override async reloadFileContent(): Promise<void> {
    if (!this.fileName) return
    try {
      // @ts-ignore — 只在 renderer 里执行，window.fileApi 一定存在
      const text = await window.fileApi.readText(this.fileName)
      this.setContent(text)
    } catch (err) {
      console.warn('[JsonFileNode] 读取替换后的文件失败：', this.fileName, err)
    }
  }

  /** 节点对外暴露的 JSON 原始文本 */
  get content(): string {
    return this.contentValue
  }

  /**
   * 输入端口收到值的统一入口。
   * FileNode 基类处理 fileInput（替换文件），这里新增 rawInput / jsonInput（写入内容）。
   */
  override inputPortReceiveValue(ports: InputPort[]): void {
    // 基类逻辑：fileInput 收到文件 → 替换
    super.inputPortReceiveValue(ports)

    // 新增逻辑：rawInput 收到字符串 → 更新内容并落盘
    if (ports.includes(this.rawInput)) {
      const [value] = this.rawInput.value
      if (value instanceof StringValue && !value.isNull) {
        void this.applyContent(value.value!)
      }
    }

    // 新增逻辑：jsonInput 收到结构化对象 → 序列化后写入
    if (ports.includes(this.jsonInput)) {
      const [value] = this.jsonInput.value
      if (value instanceof JsonValue && !value.isNull) {
        const serialized = JSON.stringify(value.value)
        void this.applyContent(serialized)
      }
    }
  }

  /**
   * 把 JSON 文本写入节点内容并同步落盘。
   * 先写磁盘，成功了再改内存——确保 contentValue 始终等于磁盘文件内容。
   * 没有 fileName 时先创建文件再写入，主进程处理重名冲突。
   *
   * 对外公开：renderer 层的 Monaco 编辑器保存回调、以及输入端口 rawInput 都通过它写入。
   */
  async applyContent(text: string): Promise<void> {
    try {
      // @ts-ignore — 只在 renderer 里执行，window.fileApi 一定存在
      const base64 = bytesToBase64(new TextEncoder().encode(text))
      // @ts-ignore
      const result = await window.fileApi.writeBuffer(this.fileName || `${this.id}.json`, base64, true)
      // 落盘成功 → 写回 fileName（可能是新创建的）+ 改内存 + commit 端口
      this.fileNameValue = result.fileName
      this.fileSizeValue = result.size
      this.setContent(text)
      void this.commitPath()
      this.notifyChanged()
      this.completeRun()
    } catch (err) {
      // 落盘失败 → 内存保持旧值（或空），不变量不破
      console.warn('[JsonFileNode] 写入磁盘文件失败：', this.fileName || `${this.id}.json`, err)
    }
  }

  /**
   * 写入内容并 commit 三个输出端口。
   * 内部方法，由 applyContent / onReady / reloadFileContent 调用。
   */
  private setContent(text: string): void {
    if (text === this.contentValue) return
    this.contentValue = text

    // rawOutput 总是 commit 原始文本
    this.rawOutput.commit(new StringValue(text))

    // jsonOutput：尝试解析，失败则 commit null
    let parsed: unknown
    let parseOk = true
    if (text.trim()) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parseOk = false
      }
    } else {
      parseOk = false
    }
    if (parseOk) {
      this.jsonOutput.commit(new JsonValue(parsed))
    } else {
      this.jsonOutput.commit(new JsonValue()) // isNull=true
    }

    // 构造 JsonFileValue：用文本内容 new File + djb2 算 hash
    if (this.fileName) {
      const file = new File([text], this.fileName, { type: 'application/json' })
      const hash = djb2(text)
      this.fileOutput.commit(new JsonFileValue(file, hash))
    }

    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    return { ...super.saveState(), content: this.contentValue }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)
    const text = typeof state.content === 'string' ? state.content : ''
    if (text) {
      this.contentValue = text
      this.rawOutput.commit(new StringValue(text))

      // jsonOutput：尝试解析
      let parseOk = true
      if (text.trim()) {
        try {
          const parsed = JSON.parse(text)
          this.jsonOutput.commit(new JsonValue(parsed))
        } catch {
          parseOk = false
        }
      } else {
        parseOk = false
      }
      if (!parseOk) {
        this.jsonOutput.commit(new JsonValue())
      }

      // 持久化恢复时 fileName 已由 super.readState 恢复，构造 JsonFileValue commit
      if (this.fileName) {
        const file = new File([text], this.fileName, { type: 'application/json' })
        const hash = djb2(text)
        this.fileOutput.commit(new JsonFileValue(file, hash))
      }
    }
  }
}
