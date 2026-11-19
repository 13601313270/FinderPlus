import { ref } from 'vue'

/**
 * 飞书联系人全局设置。
 *
 * 每个联系人 = 显示名 + 接收方 ID（open_id / user_id / union_id / email / chat_id）+ ID 类型 + 绑定机器人。
 *
 * botId 必须必填——因为 open_id / union_id / user_id 是应用隔离的，
 * 同一个人的这些 ID 在不同自建应用里不同，不绑机器人等于配置了个无用条目。
 * 邮箱 / 群 chat_id 虽然不做应用隔离，但为了统一管理也强制绑定。
 *
 * 用途：NotifyNode 配置飞书推送时，下拉选联系人即可（机器人由联系人决定），
 * 也可在节点侧 override 机器人用另一个身份发。
 *
 * 存储：localStorage（键 canvasdesk.feishu.persons），值为 FeishuPerson[] JSON 数组。
 */

const STORAGE_KEY = 'canvasdesk.feishu.persons'

export type ReceiveIdType = 'chat_id' | 'open_id' | 'user_id' | 'union_id' | 'email'

export interface FeishuPerson {
  /** 稳定 id */
  id: string
  /** 用户可见的名称（如 "老王"、"张三"、"运营群"） */
  name: string
  /** 接收方 ID（open_id / user_id / union_id / email / chat_id） */
  receiveId: string
  /** 接收方 ID 类型 */
  receiveIdType: ReceiveIdType
  /** 绑定机器人（引用 canvasdesk.feishu.bots 的 id）。必选——ID 应用隔离决定的 */
  botId: string
  /** 创建时间戳 */
  createdAt: number
}

const ALL_RECEIVE_ID_TYPES: ReceiveIdType[] = ['chat_id', 'open_id', 'user_id', 'union_id', 'email']

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
      // botId 现在是必选；历史上没绑的条目（undefined）要丢弃，避免下游误用
      .filter((v: any): v is FeishuPerson =>
        v
        && typeof v.id === 'string'
        && typeof v.name === 'string'
        && typeof v.receiveId === 'string'
        && isValidReceiveIdType(v.receiveIdType)
        && typeof v.botId === 'string'
        && v.botId.trim()
      )
      .map((v) => ({
        id: v.id,
        name: v.name.trim().slice(0, 32),
        receiveId: v.receiveId.trim(),
        receiveIdType: v.receiveIdType,
        botId: v.botId.trim(),
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

/** 新增一个联系人；name / receiveId / botId 必须非空 */
function add(
  name: string,
  receiveId: string,
  receiveIdType: ReceiveIdType,
  botId: string
): FeishuPerson {
  const trimmedName = name.trim().slice(0, 32) || '未命名'
  const person: FeishuPerson = {
    id: genId(),
    name: trimmedName,
    receiveId: receiveId.trim(),
    receiveIdType,
    botId: botId.trim(),
    createdAt: Date.now()
  }
  persons.value = [...persons.value, person]
  save(persons.value)
  return person
}

/** 更新联系人；字段为空串则保留原值 */
function update(
  id: string,
  patch: Partial<Pick<FeishuPerson, 'name' | 'receiveId' | 'receiveIdType' | 'botId'>>
): void {
  const list = persons.value.map((it) => {
    if (it.id !== id) return it
    return {
      ...it,
      name: patch.name !== undefined ? patch.name.trim().slice(0, 32) || it.name : it.name,
      receiveId: patch.receiveId !== undefined ? patch.receiveId.trim() : it.receiveId,
      receiveIdType: patch.receiveIdType !== undefined ? patch.receiveIdType : it.receiveIdType,
      botId: patch.botId !== undefined ? patch.botId.trim() || it.botId : it.botId
    }
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
  { value: 'chat_id', label: '群 chat_id' },
  { value: 'open_id', label: '用户 open_id' },
  { value: 'user_id', label: '员工 user_id' },
  { value: 'union_id', label: 'union_id' },
  { value: 'email', label: '邮箱' }
]

export function useFeishuPersons() {
  return { persons, add, update, remove, find, getLabel }
}
