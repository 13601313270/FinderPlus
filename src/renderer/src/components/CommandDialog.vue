<script setup lang="ts">
/**
 * 全局命令行弹窗工具（纯展示模式）。
 *
 * 打开必须传入命令字符串，弹窗自动开始执行并实时展示输出，
 * 没有输入框、没有历史、没有重新执行按钮——纯粹的命令执行结果查看器。
 *
 * 全局调用方式：
 *
 *   // 打开弹窗执行命令，返回 { stdout, stderr, code }
 *   const result = await window.runCommand('ls -la ~')
 *
 *   // 只打开弹窗不等待结果（fire-and-forget）
 *   window.openCommandDialog('npm run test', { title: '测试输出' })
 *
 * 弹窗特性：
 * - 实时流式输出（spawn + IPC chunk 推送）
 * - 支持中途「停止」
 * - 输出区自动跟随滚动到底部
 */
import { onBeforeUnmount, onMounted, nextTick, ref } from 'vue'

type RunStatus = 'idle' | 'running' | 'done' | 'killed'

interface OpenOpts {
  title?: string
}

interface DialogState {
  visible: boolean
  title: string
  /** 当前执行的命令字符串（只读展示用） */
  command: string
  status: RunStatus
  outputText: string
}

const state = ref<DialogState>({
  visible: false,
  title: '命令行',
  command: '',
  status: 'idle',
  outputText: ''
})

/** 主进程返回的 listenerId，用来 kill 和路由 chunk */
let currentListenerId: string | null = null

/** chunk 监听器的解绑函数 */
let offChunk: (() => void) | null = null

/** 当前 exit 的 Promise resolve 回调（runCommand 用） */
let exitResolve: ((result: { stdout: string; stderr: string; code: number }) => void) | null = null

const outputRef = ref<HTMLDivElement | null>(null)

// —— 打开 / 关闭 ——

function open(command: string, opts?: OpenOpts): Promise<{ stdout: string; stderr: string; code: number }> {
  // 每次打开返回一个新的 Promise，resolve 在 exit chunk 时触发
  return new Promise((resolve) => {
    state.value = {
      visible: true,
      title: opts?.title ?? '命令行',
      command: command,
      status: 'running',
      outputText: ''
    }
    exitResolve = resolve
    void runInternal(command)
  })
}

function close(): void {
  if (state.value.status === 'running' && currentListenerId) {
    void window.commandApi.killStream(currentListenerId)
  }
  state.value.visible = false
  cleanup()
  // 兜底 resolve，防止调用方 Promise 永远悬挂
  if (exitResolve) {
    exitResolve({ stdout: state.value.outputText, stderr: '', code: 1 })
    exitResolve = null
  }
}

function cleanup(): void {
  offChunk?.()
  offChunk = null
  currentListenerId = null
}

// —— 执行逻辑 ——

function appendOutput(prefix: string, data: string): void {
  if (!data) return
  const lines = data.split('\n')
  const prefixed = lines.map((line, i) => {
    if (i === lines.length - 1 && line === '') return ''
    return prefix + line
  }).join('\n')
  state.value.outputText += prefixed
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
  })
}

function handleChunk(payload: { listenerId: string; type: string; data?: string; code?: number }): void {
  if (payload.listenerId !== currentListenerId) return

  if (payload.type === 'stdout') {
    appendOutput('│ ', payload.data ?? '')
  } else if (payload.type === 'stderr') {
    appendOutput('✗ ', payload.data ?? '')
  } else if (payload.type === 'exit') {
    const code = payload.code ?? 0
    state.value.outputText += `\n—— 进程退出，code = ${code} ${code === 0 ? '✓' : '✗'} ——\n`
    state.value.status = code === 0 ? 'done' : 'killed'
    cleanup()

    // 汇总 stdout / stderr 并 resolve
    const { stdout, stderr } = splitOutput(state.value.outputText)
    exitResolve?.({ stdout, stderr, code })
    exitResolve = null
  }
}

function splitOutput(text: string): { stdout: string; stderr: string } {
  const lines = text.split('\n')
  const stdoutLines: string[] = []
  const stderrLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('✗ ')) {
      stderrLines.push(line.slice(2))
    } else if (line.startsWith('│ ')) {
      stdoutLines.push(line.slice(2))
    }
    // exit 提示等其他行忽略
  }
  return { stdout: stdoutLines.join('\n'), stderr: stderrLines.join('\n') }
}

async function runInternal(command: string): Promise<void> {
  try {
    // 订阅 chunk 事件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ipcRenderer = (window as any).electron?.ipcRenderer
    if (ipcRenderer) {
      const handler = (_e: unknown, payload: { listenerId: string; type: string; data?: string; code?: number }) => {
        handleChunk(payload)
      }
      ipcRenderer.on('command:chunk', handler)
      offChunk = () => ipcRenderer.removeListener('command:chunk', handler)
    }

    const res = await window.commandApi.runStream(command)
    currentListenerId = res.listenerId
  } catch (err) {
    state.value.outputText += `启动命令失败: ${err instanceof Error ? err.message : String(err)}\n`
    state.value.status = 'killed'
    cleanup()
    exitResolve?.({ stdout: '', stderr: err instanceof Error ? err.message : String(err), code: 1 })
    exitResolve = null
  }
}

async function stop(): Promise<void> {
  if (state.value.status !== 'running' || !currentListenerId) return
  await window.commandApi.killStream(currentListenerId)
  state.value.status = 'killed'
}

function copyOutput(): void {
  if (!state.value.outputText) return
  void navigator.clipboard.writeText(state.value.outputText)
}

// —— 键盘监听 ——

function onGlobalKeydown(e: KeyboardEvent): void {
  if (!state.value.visible) return
  if (e.key === 'Escape') {
    e.preventDefault()
    if (state.value.status === 'running') {
      void stop()
    } else {
      close()
    }
  }
}

// —— imperative API（挂到 window 上）——

window.runCommand = (command: string, opts?: OpenOpts): Promise<{ stdout: string; stderr: string; code: number }> => {
  return open(command, opts)
}

window.openCommandDialog = (command: string, opts?: OpenOpts): void => {
  void open(command, opts)
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  cleanup()
  window.removeEventListener('keydown', onGlobalKeydown)
})

// 暴露给模板
const isRunning = () => state.value.status === 'running'
</script>

<template>
  <Teleport to="body">
    <Transition name="cd-fade">
      <div v-if="state.visible" class="cd-mask" @click.self="close">
        <div class="cd-dialog" role="dialog" aria-modal="true">
          <!-- 标题栏 -->
          <div class="cd-header">
            <span class="cd-title">⌨ {{ state.title }}</span>
            <button class="cd-close" type="button" title="关闭 (Esc)" @click="close">×</button>
          </div>

          <!-- 当前执行的命令展示行 -->
          <div class="cd-cmd-row">
            <span class="cd-prompt">$</span>
            <span class="cd-cmd-text">{{ state.command }}</span>
          </div>

          <!-- 输出区 -->
          <div ref="outputRef" class="cd-output">
            <pre class="cd-output-pre">{{ state.outputText || '启动中...' }}</pre>
          </div>

          <!-- 底部操作栏 -->
          <div class="cd-footer">
            <div class="cd-status">
              <span v-if="isRunning()" class="cd-status-running">● 执行中...</span>
              <span v-else-if="state.status === 'done'" class="cd-status-done">✓ 完成</span>
              <span v-else-if="state.status === 'killed'" class="cd-status-killed">✗ 退出/被终止</span>
              <span v-else class="cd-status-idle">— 就绪</span>
            </div>

            <div class="cd-actions">
              <button
                class="cd-btn cd-btn--ghost"
                type="button"
                :disabled="!state.outputText"
                @click="copyOutput"
              >复制输出</button>
              <button
                v-if="isRunning()"
                class="cd-btn cd-btn--danger"
                type="button"
                @click="stop"
              >停止</button>
              <button
                v-else
                class="cd-btn cd-btn--ghost"
                type="button"
                @click="close"
              >关闭</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cd-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(17, 24, 39, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: cdMaskIn 0.15s ease;
}

.cd-dialog {
  width: 720px;
  max-width: 90vw;
  height: 560px;
  max-height: 85vh;
  background: #1e1e2e;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: cdPopIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  color: #cdd6f4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.cd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #181825;
  border-bottom: 1px solid #313244;
}

.cd-title {
  font-size: 13px;
  font-weight: 600;
  color: #cdd6f4;
}

.cd-close {
  all: unset;
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #a6adc8;
  line-height: 1;
  transition: background 0.12s ease, color 0.12s ease;
}
.cd-close:hover {
  background: #313244;
  color: #f38ba8;
}

/* —— 命令展示行（只读，不可编辑）—— */
.cd-cmd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #181825;
  border-bottom: 1px solid #313244;
  overflow: hidden;
}

.cd-prompt {
  color: #a6e3a1;
  font-weight: 600;
  font-family: ui-monospace, 'SF Mono', 'Menlo', monospace;
  font-size: 13px;
  user-select: none;
  flex-shrink: 0;
}

.cd-cmd-text {
  font-family: ui-monospace, 'SF Mono', 'Menlo', monospace;
  font-size: 13px;
  color: #89b4fa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* —— 输出区 —— */
.cd-output {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  background: #11111b;
  scroll-behavior: smooth;
}

.cd-output::-webkit-scrollbar {
  width: 8px;
}
.cd-output::-webkit-scrollbar-track {
  background: transparent;
}
.cd-output::-webkit-scrollbar-thumb {
  background: #45475a;
  border-radius: 4px;
}
.cd-output::-webkit-scrollbar-thumb:hover {
  background: #585b70;
}

.cd-output-pre {
  margin: 0;
  font-family: ui-monospace, 'SF Mono', 'Menlo', monospace;
  font-size: 12.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
  color: #cdd6f4;
}

/* —— 底部操作栏 —— */
.cd-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #181825;
  border-top: 1px solid #313244;
  gap: 12px;
}

.cd-status {
  font-size: 12px;
  font-family: ui-monospace, 'SF Mono', 'Menlo', monospace;
}

.cd-status-running {
  color: #fab387;
}
.cd-status-done {
  color: #a6e3a1;
}
.cd-status-killed {
  color: #f38ba8;
}
.cd-status-idle {
  color: #6c7086;
}

.cd-actions {
  display: flex;
  gap: 6px;
}

.cd-btn {
  all: unset;
  cursor: pointer;
  padding: 5px 14px;
  font-size: 12px;
  border-radius: 6px;
  transition: background 0.12s ease, color 0.12s ease, opacity 0.12s ease;
  font-weight: 500;
  user-select: none;
}
.cd-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cd-btn--ghost {
  color: #bac2de;
}
.cd-btn--ghost:not(:disabled):hover {
  background: #313244;
  color: #cdd6f4;
}
.cd-btn--primary {
  background: #89b4fa;
  color: #1e1e2e;
}
.cd-btn--primary:not(:disabled):hover {
  background: #b4befe;
}
.cd-btn--danger {
  background: #f38ba8;
  color: #1e1e2e;
}
.cd-btn--danger:hover {
  background: #eba0ac;
}

.cd-fade-enter-active,
.cd-fade-leave-active {
  transition: opacity 0.15s ease;
}
.cd-fade-enter-from,
.cd-fade-leave-to {
  opacity: 0;
}

@keyframes cdMaskIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes cdPopIn {
  from { opacity: 0; transform: scale(0.94) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
