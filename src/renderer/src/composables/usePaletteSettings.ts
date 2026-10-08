import { ref } from 'vue'

/**
 * 调色板节点可见性设置（module 级单例）。
 *
 * 存储：localStorage（键 canvasdesk.palette.hiddenTypes）。
 * 值为 JSON 数组，存的是被**隐藏**的节点 type 字符串（blocklist 语义）。
 *
 * 为什么用 blocklist 而不是 allowlist：
 * 新增节点默认应该出现在调色板里。如果用 allowlist，每加一个新节点都要手动勾上
 * 才会显示——这对开发者和用户都不友好。blocklist 天然让新节点可见，用户想隐藏
 * 再自己取消勾选即可。
 *
 * 影响范围：只控制调色板是否展示，不影响节点渲染、不影响已有画布上的节点实例。
 * 隐藏某个节点类型后，画布上已有的该类型节点照常工作。
 */

const STORAGE_KEY = 'canvasdesk.palette.hiddenTypes'

/** 从 localStorage 读取隐藏列表；不存在时返回空数组（全部可见） */
function loadHidden(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    // JSON 非法 → 当作不存在，返回空数组
  }
  return []
}

function saveHidden(types: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...types]))
}

const hiddenTypes = ref<Set<string>>(new Set(loadHidden()))

/** 切换某个节点类型的可见性：true → 隐藏，false → 显示 */
function toggleHidden(type: string, hidden: boolean): void {
  if (hidden) {
    hiddenTypes.value.add(type)
  } else {
    hiddenTypes.value.delete(type)
  }
  // 触发 Vue 响应式（Set 的 add/delete 不会自动触发，赋值新 Set 才能让 computed 重新计算）
  hiddenTypes.value = new Set(hiddenTypes.value)
  saveHidden(hiddenTypes.value)
}

/** 某个节点类型当前是否被隐藏 */
function isHidden(type: string): boolean {
  return hiddenTypes.value.has(type)
}

/** 全部显示（清空隐藏列表） */
function showAll(): void {
  hiddenTypes.value = new Set()
  saveHidden(hiddenTypes.value)
}

export function usePaletteSettings() {
  return { hiddenTypes, toggleHidden, isHidden, showAll }
}
