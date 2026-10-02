import { ref } from 'vue'

/**
 * 首次启动新手引导（module 级单例）。
 *
 * 与 useHelpCenter / useGlobalSettings 同一模式：状态在模块顶层定义，
 * 任何组件调用 useOnboarding() 拿到的都是同一套 ref。
 *
 * 进度持久化：localStorage（键 canvasdesk.tutorialSeen）。
 * 一旦用户完成或跳过，下次启动不再自动弹出。
 */

const STORAGE_KEY = 'canvasdesk.tutorialSeen'

/** 引导是否激活中（true = 遮罩显示、监听交互事件） */
const active = ref(false)

/**
 * 当前步骤索引：
 *   0 = 第一步：拖文件进画布
 *   1 = 第二步：添加 File Info 节点并连线
 */
const step = ref(0)

/** 引导是否已完成（从 localStorage 读取） */
function isSeen(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1'
}

function markSeen(): void {
  localStorage.setItem(STORAGE_KEY, '1')
}

/** 启动引导：仅在未见过时自动触发 */
function start(): void {
  if (isSeen()) return
  step.value = 0
  active.value = true
}

/** 跳到下一步；已在最后一步时什么都不做 */
function nextStep(): void {
  if (!active.value) return
  if (step.value < 1) {
    step.value++
  }
}

/** 标记完成并关闭 */
function complete(): void {
  active.value = false
  markSeen()
}

/** 跳过并关闭 */
function skip(): void {
  active.value = false
  markSeen()
}

/**
 * 复位并立刻重新弹出引导。
 * 用于设置面板的「重新观看新手引导」按钮——清除 seen 标记，重置 step，立即激活。
 */
function restart(): void {
  localStorage.removeItem(STORAGE_KEY)
  step.value = 0
  active.value = true
}

export function useOnboarding() {
  return { active, step, start, nextStep, complete, skip, restart }
}
