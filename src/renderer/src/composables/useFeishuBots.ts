import { ref } from 'vue'

/**
 * 飞书机器人全局设置。
 *
 * 每个机器人对应一组飞书开放平台自建应用凭证（App ID + App Secret）。
 * 节点只存 botId，通过 botId 反查凭证后调 IPC。
 *
 * 存储：localStorage（键 canvasdesk.feishu.bots），
 * 值为 FeishuBot[] JSON 数组。
 */

const STORAGE_KEY = 'canvasdesk.feishu.bots'

export interface FeishuBot {
  /** 稳定 id（uuid 风格） */
  id: string
  /** 用户可见的名称（如 "通知群机器人"、"测试环境"） */
  name: string
  /** 飞书开放平台 App ID（cli_ 开头） */
  appId: string
  /** 飞书开放平台 App Secret */
  appSecret: string
  /** 创建时间戳 */
  createdAt: number
}

/** 从 localStorage 读取列表；不存在 / 解析失败 → 返回空数组 */
function load(): FeishuBot[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v: any): v is FeishuBot =>
        v
        && typeof v.id === 'string'
        && typeof v.name === 'string'
        && typeof v.appId === 'string'
        && typeof v.appSecret === 'string'
      )
      .map((v) => ({
        id: v.id,
        name: v.name.trim().slice(0, 32),
        appId: v.appId.trim(),
        appSecret: v.appSecret.trim(),
        createdAt: typeof v.createdAt === 'number' ? v.createdAt : Date.now()
      }))
  } catch {
    return []
  }
}

function save(list: FeishuBot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

const bots = ref<FeishuBot[]>(load())

/** 生成一个短 id（与项目其他 id 生成方式一致） */
function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** 新增一个机器人，返回新 id；空名 → "未命名"；appId/appSecret 必须非空 */
function add(name: string, appId: string, appSecret: string): FeishuBot {
  const trimmedName = name.trim().slice(0, 32) || '未命名'
  const bot: FeishuBot = {
    id: genId(),
    name: trimmedName,
    appId: appId.trim(),
    appSecret: appSecret.trim(),
    createdAt: Date.now()
  }
  bots.value = [...bots.value, bot]
  save(bots.value)
  return bot
}

/** 更新机器人；字段为空串则保留原值 */
function update(id: string, patch: Partial<Pick<FeishuBot, 'name' | 'appId' | 'appSecret'>>): void {
  const list = bots.value.map((it) => {
    if (it.id !== id) return it
    return {
      ...it,
      name: patch.name !== undefined ? patch.name.trim().slice(0, 32) || it.name : it.name,
      appId: patch.appId !== undefined ? patch.appId.trim() : it.appId,
      appSecret: patch.appSecret !== undefined ? patch.appSecret.trim() : it.appSecret
    }
  })
  bots.value = list
  save(list)
}

/** 删除一个机器人 */
function remove(id: string): void {
  const list = bots.value.filter((it) => it.id !== id)
  if (list.length === bots.value.length) return
  bots.value = list
  save(list)
}

/** 按 id 查找；找不到返回 undefined */
function find(id: string | undefined | null): FeishuBot | undefined {
  if (!id) return undefined
  return bots.value.find((it) => it.id === id)
}

/** 返回机器人显示名；找不到或传 undefined → 返回 "未配置" */
function getLabel(id: string | undefined | null): string {
  if (!id) return '未配置'
  return find(id)?.name ?? '未配置'
}

export function useFeishuBots() {
  return { bots, add, update, remove, find, getLabel }
}
