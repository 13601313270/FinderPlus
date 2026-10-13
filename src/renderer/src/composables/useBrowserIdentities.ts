import { ref } from 'vue'

/**
 * 浏览器身份（Browser Identity）全局设置。
 *
 * 每个身份对应 Electron 的一个独立 persist partition，
 * 从而让一组浏览器节点共享 cookie / localStorage / IndexedDB 等
 * 会话数据，实现"多个节点用同一个账号"的效果。
 *
 * 存储：localStorage（键 canvasdesk.browser.identities），
 * 值为 Identity[] JSON 数组。
 *
 * 浏览器节点的 identityId 字段：
 *   - undefined → 独立模式（partition 按 nodeId 生成）
 *   - 某个身份 id → 共享该身份（partition 按 identityId 生成）
 */

const STORAGE_KEY = 'canvasdesk.browser.identities'

export interface BrowserIdentity {
  /** 稳定 id（uuid 风格） */
  id: string
  /** 用户可见的名称（如 "工作账号"、"测试环境"） */
  name: string
  /** 创建时间戳 */
  createdAt: number
}

/** 从 localStorage 读取身份列表；不存在 / 解析失败 → 返回空数组 */
function load(): BrowserIdentity[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v: any): v is BrowserIdentity =>
        v && typeof v.id === 'string' && typeof v.name === 'string'
      )
      .map((v) => ({
        id: v.id,
        name: v.name.trim().slice(0, 32),
        createdAt: typeof v.createdAt === 'number' ? v.createdAt : Date.now()
      }))
  } catch {
    return []
  }
}

function save(list: BrowserIdentity[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

const identities = ref<BrowserIdentity[]>(load())

/** 生成一个短 id（uuid 风格，与项目其他 id 生成方式一致） */
function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** 新增一个身份，返回新 id；空名会被替换为 "未命名" */
function add(name: string): BrowserIdentity {
  const trimmed = name.trim().slice(0, 32) || '未命名'
  const id = genId()
  const item: BrowserIdentity = { id, name: trimmed, createdAt: Date.now() }
  identities.value = [...identities.value, item]
  save(identities.value)
  return item
}

/** 更新身份名称；name 为空则不更新 */
function rename(id: string, name: string): void {
  const trimmed = name.trim().slice(0, 32)
  if (!trimmed) return
  const list = identities.value.map((it) =>
    it.id === id ? { ...it, name: trimmed } : it
  )
  // 只有真的变了才触发响应式 + 持久化
  const changed = !list.every((it, i) => it.name === identities.value[i]!.name)
  if (!changed) return
  identities.value = list
  save(list)
}

/** 删除一个身份（不关心是否有节点在引用——调用方负责降级处理） */
function remove(id: string): void {
  const list = identities.value.filter((it) => it.id !== id)
  if (list.length === identities.value.length) return
  identities.value = list
  save(list)
}

/** 按 id 查找；找不到返回 undefined */
function find(id: string | undefined | null): BrowserIdentity | undefined {
  if (!id) return undefined
  return identities.value.find((it) => it.id === id)
}

/** 返回身份名称；找不到或传 undefined → 返回 "独立" */
function getLabel(id: string | undefined | null): string {
  if (!id) return '独立'
  return find(id)?.name ?? '独立'
}

export function useBrowserIdentities() {
  return { identities, add, rename, remove, find, getLabel }
}
