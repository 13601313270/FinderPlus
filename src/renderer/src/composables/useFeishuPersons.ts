import { ref } from 'vue'

/**
 * 飞书联系人全局设置。
 *
 * 联系人语义：一个人或一个群——不绑定发送管道（机器人），botId 由消费方节点自己指定。
 * 支持的 receiveIdType：union_id / user_id（员工 ID）/ email / chat_id（群）。
 * 故意去掉 open_id——open_id 是应用隔离的，属于"发送管道"层的东西，不属于联系人本身。
 *
 * 用途：NotifyNode / HumanReviewNode / FeishuSendNode 等节点配置飞书推送时，
 * 下拉选联系人（接收方是谁），再自己选机器人（用哪个身份发）。
 *
 * 存储：localStorage（键 canvasdesk.feishu.persons），值为 FeishuPerson[] JSON 数组。
 */

const STORAGE_KEY = 'canvasdesk.feishu.persons'

/**
 * 接收方 ID 类型——故意去掉 open_id。
 * open_id 是应用隔离的（同一个人换自建应用就不同），不属于"联系人"这个领域概念。
 * union_id / user_id / email / chat_id 全是跨应用统一的，才配叫"联系人"。
 */
export type ReceiveIdType = 'chat_id' | 'union_id' | 'user_id' | 'email'

export interface FeishuPerson {
  /** 稳定 id */
  id: string
  /** 用户可见的名称（如 "老王"、"张三"、"运营群"） */
  name: string
  /** 接收方 ID（union_id / user_id / email / chat_id 之一） */
  receiveId: string
  /** 接收方 ID 类型 */
  receiveIdType: ReceiveIdType
  /** 是否启用；关闭时所有发送给此联系人的操作自动跳过 */
  enabled: boolean
  /** 创建时间戳 */
  createdAt: number
}

const ALL_RECEIVE_ID_TYPES: ReceiveIdType[] = ['chat_id', 'union_id', 'user_id', 'email']

function isValidReceiveIdType(v: unknown): v is ReceiveIdType {
  return typeof v === 'string' && ALL_RECEIVE_ID_TYPES.includes(v as ReceiveIdType)
}

/** 从 localStorage 读取列表；不存在 / 解析失败 → 返回空数组 */
function load(): FeishuPerson[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v: any): v is FeishuPerson =>
        v
        && typeof v.id === 'string'
        && typeof v.name === 'string'
        && typeof v.receiveId === 'string'
        && isValidReceiveIdType(v.receiveIdType)
      )
      .map((v) => ({
        id: v.id,
        name: v.name.trim().slice(0, 32),
        receiveId: v.receiveId.trim(),
        receiveIdType: v.receiveIdType,
        enabled: v.enabled !== false,  // 老数据没有 enabled 字段 → 默认 true
        createdAt: typeof v.createdAt === 'number' ? v.createdAt : Date.now()
      }))
  } catch {
    return []
  }
}

function save(list: FeishuPerson[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

const persons = ref<FeishuPerson[]>(load())

function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** 新增一个联系人；name / receiveId 必须非空；默认 enabled=true */
function add(
  name: string,
  receiveId: string,
  receiveIdType: ReceiveIdType
): FeishuPerson {
  const trimmedName = name.trim().slice(0, 32) || '未命名'
  const person: FeishuPerson = {
    id: genId(),
    name: trimmedName,
    receiveId: receiveId.trim(),
    receiveIdType,
    enabled: true,
    createdAt: Date.now()
  }
  persons.value = [...persons.value, person]
  save(persons.value)
  return person
}

/** 更新联系人；字段为空串则保留原值 */
function update(
  id: string,
  patch: Partial<Pick<FeishuPerson, 'name' | 'receiveId' | 'receiveIdType' | 'enabled'>>
): void {
  const list = persons.value.map((it) => {
    if (it.id !== id) return it
    return {
      ...it,
      name: patch.name !== undefined ? patch.name.trim().slice(0, 32) || it.name : it.name,
      receiveId: patch.receiveId !== undefined ? patch.receiveId.trim() : it.receiveId,
      receiveIdType: patch.receiveIdType !== undefined ? patch.receiveIdType : it.receiveIdType,
      enabled: patch.enabled !== undefined ? !!patch.enabled : it.enabled
    }
  })
  persons.value = list
  save(list)
}

/** 切换某个联系人的启用状态 */
function toggleEnabled(id: string): void {
  const list = persons.value.map((it) => {
    if (it.id !== id) return it
    return { ...it, enabled: !it.enabled }
  })
  persons.value = list
  save(list)
}

/** 删除一个联系人 */
function remove(id: string): void {
  const list = persons.value.filter((it) => it.id !== id)
  if (list.length === persons.value.length) return
  persons.value = list
  save(list)
}

/** 按 id 查找 */
function find(id: string | undefined | null): FeishuPerson | undefined {
  if (!id) return undefined
  return persons.value.find((it) => it.id === id)
}

/** 返回联系人显示名；找不到或传 undefined → 返回 "未配置" */
function getLabel(id: string | undefined | null): string {
  if (!id) return '未配置'
  return find(id)?.name ?? '未配置'
}

/** 预定义的 ID 类型下拉选项（带中文 label） */
export const RECEIVE_ID_TYPE_OPTIONS: { value: ReceiveIdType; label: string }[] = [
  { value: 'union_id', label: 'union_id（跨应用统一）' },
  { value: 'user_id', label: '员工 user_id' },
  { value: 'email', label: '邮箱' },
  { value: 'chat_id', label: '群 chat_id' }
]

export function useFeishuPersons() {
  return { persons, add, update, remove, find, getLabel, toggleEnabled }
}
