import { reactive } from 'vue'

/**
 * 画布顶部的一次性提示。
 *
 * 本来只有「连线失败」一个来源，文案状态就摆在 connectionDrag 里；现在拖入文件、
 * 移出文件、连线失败都要说话，于是收成一处：**谁有话说谁调 `showCanvasNotice`**，
 * App.vue 只负责把那一条提示画出来。
 *
 * 只有一个槽位（后一条顶掉前一条）是自觉的取舍：这些都是「刚发生的一件事」的回执，
 * 同时堆三条提示反而看不清，而且会把画布顶乱。
 */
export type NoticeTone = 'info' | 'error'

export const canvasNotice = reactive<{ text: string; tone: NoticeTone }>({
  text: '',
  tone: 'info'
})

const NOTICE_DURATION = 2600

let timer: number | undefined

/** 显示一条提示。默认 2.6 秒后自动消失 */
export function showCanvasNotice(
  text: string,
  tone: NoticeTone = 'info',
  duration = NOTICE_DURATION
): void {
  canvasNotice.text = text
  canvasNotice.tone = tone
  window.clearTimeout(timer)
  timer = window.setTimeout(clearCanvasNotice, duration)
}

export function clearCanvasNotice(): void {
  window.clearTimeout(timer)
  canvasNotice.text = ''
}
