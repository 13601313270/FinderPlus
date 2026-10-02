import { base64ToBytes } from '../../engine/data/base64'
import { FileValue } from '../../engine/data/FileValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { FileNode } from '../FileNode/node'

/** 计算 SHA-256 hex 摘要（用 Web Crypto API） */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // 新版 TS 的 Uint8Array 泛型与旧 DOM BufferSource 定义不兼容，强转
  const buf = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 文件后缀 → 推测 MIME（无后缀返回空串，File 构造时可省略） */
function guessMime(name: string): string {
  const map: Record<string, string> = {
    '.pdf': 'application/pdf', '.zip': 'application/zip',
    '.json': 'application/json', '.xml': 'application/xml',
    '.html': 'text/html', '.htm': 'text/html',
    '.css': 'text/css', '.md': 'text/markdown',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime',
    '.txt': 'text/plain', '.csv': 'text/csv',
  }
  const lastDot = name.lastIndexOf('.')
  if (lastDot < 0) return ''
  return map[name.slice(lastDot).toLowerCase()] ?? ''
}

/** 文件字节（base64）→ 算 hash → 构造 FileValue */
async function buildFileValue(fileName: string, base64: string): Promise<FileValue> {
  const bytes = base64ToBytes(base64)
  const hash = await sha256Hex(bytes)
  const mime = guessMime(fileName)
  // 新版 TS 的 Uint8Array 泛型与旧 DOM BlobPart 定义不兼容，强转
  const file = new File([bytes as unknown as BlobPart], fileName, mime ? { type: mime } : undefined)
  return new FileValue(file, hash)
}

/**
 * 兜底文件节点：承接所有未被具体文件节点（如 TxtFileNode）命中的后缀。
 *
 * - fileOutput：FileValue（通用文件类型，kind = 'file'），
 *   下游接 'file' 类型的节点都能连上
 */
export class AnyFileNode extends FileNode {
  static readonly TYPE = 'any-file'

  /** 任何后缀都接（注册时放在 nodeManifests 末尾，天然最后执行） */
  static override acceptsExtension(_ext: string): boolean {
    return true
  }

  readonly type = AnyFileNode.TYPE

  /** 文件输出（FileValue，kind = 'file'） */
  readonly fileOutput = new OutputPort('file', FileValue, {
    zh: '文件',
    en: 'File',
    ja: 'ファイル',
    ko: '파일',
    es: 'Archivo',
    ar: 'ملف',
    fr: 'Fichier',
    pt: 'Ficheiro',
    ru: 'Файл'
  })

  /** 文件数据输入端口：接受任何文件类型（含各类子类），收到值即替换本节点文件 */
  readonly fileInput = new InputPort('file-in', {
    accepts: [FileValue],
    label: {
      zh: '文件',
      en: 'File',
      ja: 'ファイル',
      ko: '파일',
      es: 'Archivo',
      ar: 'ملف',
      fr: 'Fichier',
      pt: 'Ficheiro',
      ru: 'Файл'
    }
  })

  constructor(id: string) {
    super(id)
    this.addOutput(this.fileOutput)
    // 基类共用的路径端口（文件绝对路径），挂在末尾
    this.addOutput(this.pathOutput)
    this.bindFileInput(this.fileInput)
    // 内容区硬约束：文件图标 72px + 文件名行 + padding ≈ 122px 高，宽 180px
    this.setBox(180, 122)
  }

  /**
   * 读取画布目录下的文件并 commit fileOutput。
   * 挂载时（持久化恢复 / 拖拽进来）和文件被输入端口替换后都走这里。
   */
  override async reloadFileContent(): Promise<void> {
    if (!this.fileName) return
    try {
      // @ts-ignore — 只在 renderer 里执行，window.fileApi 一定存在
      const base64 = await window.fileApi.readBinary(this.fileName)
      this.fileOutput.commit(await buildFileValue(this.fileName, base64))
    } catch (err) {
      // 文件可能已被用户删了，静默忽略
      console.warn('[AnyFileNode] 读取文件失败：', this.fileName, err)
    }
  }
}