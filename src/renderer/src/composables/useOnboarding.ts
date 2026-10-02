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
 * 庆祝提示：引导完成后短暂弹出，告诉用户可以自由组合节点。
 * 独立于 active——active=false 时 celebration 还能显示 2.5s 再淡出。
 */
const celebration = ref(false)

/**
 * 当前步骤索引：
 *   0 = Step 1：拖文件进画布
 *   1 = Step 2a：选 File Info（调色板高亮瓦片）
 *   2 = Step 2b：放置节点（节点跟随鼠标中，提示"点击画布放下"）
 *   3 = Step 3：连线（拉端口）
 */
const step = ref(0)

/**
 * 调色板展开状态不再由这里维护——OnboardingGuide 自己用 MutationObserver
 * 监听 DOM 上 `.palette--open` class 的变化来感知展开/收起，
 * 彻底避免引导和 NodePalette 的双向依赖。
 */

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
  if (step.value < 3) {
    step.value++
  }
}

/**
 * 精确设置当前步骤。
 * 用于外部事件驱动的子状态切换（如 FileInfoNode 被添加 → 切到 step=2 提示放置；节点放下 → 切到 step=3 提示连线）。
 */
function setStep(n: number): void {
  if (!active.value) return
  if (n < 0 || n > 3) return
  step.value = n
}

/** 标记完成并关闭 */
function complete(): void {
  active.value = false
  step.value = 0
  markSeen()
  celebration.value = true
}

/** 跳过并关闭 */
function skip(): void {
  active.value = false
  step.value = 0
  markSeen()
}

/** 关闭庆祝提示（2.5s 后自动调，或用户手动点关闭） */
function dismissCelebration(): void {
  celebration.value = false
}

/**
 * 复位并立刻重新弹出引导。
 * 用于设置面板的「重新观看新手引导」按钮——清除 seen 标记，重置 step，立即激活。
 */
function restart(): void {
  localStorage.removeItem(STORAGE_KEY)
  step.value = 0
  celebration.value = false
  active.value = true
}

export function useOnboarding() {
  return { active, step, celebration, start, nextStep, setStep, complete, skip, dismissCelebration, restart }
}
