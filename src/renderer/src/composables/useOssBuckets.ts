import { ref } from 'vue'

/**
 * 阿里云 OSS Bucket 全局设置。
 *
 * 每个 Bucket 对应一组 AccessKeyId / Secret / Region / Bucket / Endpoint。
 * OSS 三个节点（上传 / 下载 / 存在性检查）只存 bucketId，通过 bucketId 反查凭证后调 IPC。
 *
 * 存储：localStorage（键 canvasdesk.oss.buckets），
 * 值为 OssBucket[] JSON 数组。
 */

const STORAGE_KEY = 'canvasdesk.oss.buckets'

export interface OssBucket {
  /** 稳定 id */
  id: string
  /** 用户可见的名称（如 "生产环境 bucket"、"测试 bucket"） */
  name: string
  /** AccessKeyId */
  accessKeyId: string
  /** AccessKeySecret */
  accessKeySecret: string
  /** Region，如 oss-cn-hangzhou */
  region: string
  /** Bucket 名称 */
  bucket: string
  /** Endpoint（可选），自定义域名 / 传输加速 / 内网地址 */
  endpoint: string
  /** 创建时间戳 */
  createdAt: number
}

/** 从 localStorage 读取列表；不存在 / 解析失败 → 返回空数组 */
function load(): OssBucket[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v: any): v is OssBucket =>
        v
        && typeof v.id === 'string'
        && typeof v.name === 'string'
        && typeof v.accessKeyId === 'string'
        && typeof v.accessKeySecret === 'string'
        && typeof v.region === 'string'
        && typeof v.bucket === 'string'
        && typeof v.endpoint === 'string'
      )
      .map((v) => ({
        id: v.id,
        name: v.name.trim().slice(0, 64),
        accessKeyId: v.accessKeyId.trim(),
        accessKeySecret: v.accessKeySecret.trim(),
        region: v.region.trim(),
        bucket: v.bucket.trim(),
        endpoint: v.endpoint.trim(),
        createdAt: typeof v.createdAt === 'number' ? v.createdAt : Date.now()
      }))
  } catch {
    return []
  }
}

function save(list: OssBucket[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

const buckets = ref<OssBucket[]>(load())

/** 生成一个短 id（与项目其他 id 生成方式一致） */
function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** 新增一个 Bucket；name 为空 → "未命名 bucket" */
function add(name: string, accessKeyId: string, accessKeySecret: string, region: string, bucket: string, endpoint: string): OssBucket {
  const trimmedName = name.trim().slice(0, 64) || '未命名 bucket'
  const item: OssBucket = {
    id: genId(),
    name: trimmedName,
    accessKeyId: accessKeyId.trim(),
    accessKeySecret: accessKeySecret.trim(),
    region: region.trim(),
    bucket: bucket.trim(),
    endpoint: endpoint.trim(),
    createdAt: Date.now()
  }
  buckets.value = [...buckets.value, item]
  save(buckets.value)
  return item
}

/** 更新 Bucket；字段为空串则保留原值 */
function update(id: string, patch: Partial<Pick<OssBucket, 'name' | 'accessKeyId' | 'accessKeySecret' | 'region' | 'bucket' | 'endpoint'>>): void {
  const list = buckets.value.map((it) => {
    if (it.id !== id) return it
    return {
      ...it,
      name: patch.name !== undefined ? patch.name.trim().slice(0, 64) || it.name : it.name,
      accessKeyId: patch.accessKeyId !== undefined ? patch.accessKeyId.trim() : it.accessKeyId,
      accessKeySecret: patch.accessKeySecret !== undefined ? patch.accessKeySecret.trim() : it.accessKeySecret,
      region: patch.region !== undefined ? patch.region.trim() : it.region,
      bucket: patch.bucket !== undefined ? patch.bucket.trim() : it.bucket,
      endpoint: patch.endpoint !== undefined ? patch.endpoint.trim() : it.endpoint
    }
  })
  buckets.value = list
  save(list)
}

/** 删除一个 Bucket */
function remove(id: string): void {
  const list = buckets.value.filter((it) => it.id !== id)
  if (list.length === buckets.value.length) return
  buckets.value = list
  save(list)
}

/** 按 id 查找；找不到返回 undefined */
function find(id: string | undefined | null): OssBucket | undefined {
  if (!id) return undefined
  return buckets.value.find((it) => it.id === id)
}

/** 返回 Bucket 显示名；找不到或传 undefined → 返回 "未配置" */
function getLabel(id: string | undefined | null): string {
  if (!id) return '未配置'
  return find(id)?.name ?? '未配置'
}

/** 返回 Bucket 是否配置完整（accessKeyId / secret / region / bucket 四项非空） */
function isConfigured(id: string | undefined | null): boolean {
  const b = find(id)
  if (!b) return false
  return !!b.accessKeyId.trim() && !!b.accessKeySecret.trim() && !!b.region.trim() && !!b.bucket.trim()
}

export function useOssBuckets() {
  return { buckets, add, update, remove, find, getLabel, isConfigured }
}
