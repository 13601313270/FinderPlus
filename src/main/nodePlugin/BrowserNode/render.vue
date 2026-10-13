<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { BrowserNode, type ScriptItem } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { useBrowserIdentities } from '@renderer/composables/useBrowserIdentities'
import { messages } from './i18n'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'

const props = defineProps<{ id: string }>()

const browserNode = shallowRef<BrowserNode | undefined>(undefined)
const nodeTitle = useNodeTitle(() => browserNode.value, '?')
const t = useLocalizedMessages(messages)
const { openNodeDetail } = useNodeDetail()
const { identities: allIdentities } = useBrowserIdentities()

// —— webview DOM 引用 ——
const webviewEl = ref<any>(null)

/** webview 首次渲染时用的初始 URL。只在组件生命周期内设置一次，之后永远不变——
 *  这样 Vue diff 永远不会 re-patch :src 属性，杜绝意外 reload。
 *  用户后续输入新 URL 导航 → 直接调 webview.loadURL() 手动控制。
 */
const initialSrc = ref('')

/**
 * webview 重新挂载 key：identity 变化时递增此值，让 Vue 销毁旧 webview 并重建。
 *  因为 partition 属性在 webview 创建时就决定了 session，事后修改不生效。
 */
const webviewKey = ref(0)

/** webview 是否已发出 dom-ready（此后才能安全 loadURL / goBack 等） */
const webviewReady = ref(false)

// —— 浏览模式开关 ——
/** true = webview 捕获事件（默认，浏览器节点核心用途）；false = 画布事件穿透方便连线 */
const browsingMode = ref(true)

// —— 本地镜像状态 ——
const homeUrl = ref('')
const resolvedUrl = ref('')
const currentUrl = ref('')
const title = ref('')
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const canGoBack = ref(false)
const canGoForward = ref(false)
const lastError = ref('')
const zoomFactor = ref(1.0)
const scripts = ref<ScriptItem[]>([])
/** 当前 webview 使用的 partition 字符串（用于检测 identity 变化） */
const partition = ref('')
/** 最近一次显示用的身份信息（供 header 视觉标记使用） */
const displayIdentityLabel = ref<string>('')
const displayIsIsolated = ref<boolean>(true)
/** 最近一次脚本执行结果，显示在脚本按钮条下方 */
const lastScriptResult = ref<{ ok: boolean; text: string } | null>(null)

// 地址栏输入框（v-model 绑定，和 homeUrl 同步但允许临时编辑）
const addressInput = ref('')

// MethodPort navigate 序号：用于精确区分"这次是 MethodPort 触发的导航"
let lastNavigateSeq = 0

// —— Resize-handle 逻辑 ——

/** resize 会话状态：一次 mousedown 开始一次会话 */
interface ResizeSession {
  startX: number
  startY: number
  startW: number
  startH: number
  cleanup: () => void
}
const resizeState = ref<ResizeSession | null>(null)

/** 最小尺寸：跟初始 box 一致，但允许调小到 300×200 */
const MIN_W = 360
const MIN_H = 240

function onResizeHandlePointerDown(e: PointerEvent): void {
  if (!browserNode.value) return
  e.preventDefault()
  e.stopPropagation()

  // 阻止事件冒泡到画布（防止同时触发节点拖拽）
  const [bw, bh] = browserNode.value.box
  const session: ResizeSession = {
    startX: e.clientX,
    startY: e.clientY,
    startW: bw,
    startH: bh,
    cleanup: () => {
      window.removeEventListener('pointermove', onResizePointerMove)
      window.removeEventListener('pointerup', onResizePointerUp)
    }
  }

  resizeState.value = session

  function onResizePointerMove(ev: PointerEvent): void {
    if (!browserNode.value) return
    const dx = ev.clientX - session.startX
    const dy = ev.clientY - session.startY
    const newW = Math.max(MIN_W, session.startW + dx)
    const newH = Math.max(MIN_H, session.startH + dy)
    browserNode.value.setBox(newW, newH)
  }

  function onResizePointerUp(): void {
    session.cleanup()
    resizeState.value = null
  }

  window.addEventListener('pointermove', onResizePointerMove)
  window.addEventListener('pointerup', onResizePointerUp)
}

let unsubscribe: (() => void) | undefined

function syncFromNode(node: BrowserNode): void {
  homeUrl.value = node.displayHomeUrl
  resolvedUrl.value = node.displayResolvedUrl
  currentUrl.value = node.displayCurrentUrl
  title.value = node.displayTitle
  status.value = node.displayStatus
  canGoBack.value = node.displayCanGoBack
  canGoForward.value = node.displayCanGoForward
  lastError.value = node.displayLastError
  zoomFactor.value = node.currentZoomFactor
  scripts.value = node.getScripts()
  partition.value = node.partition
}

// —— 派生 ——

const loading = computed(() => status.value === 'loading')
const hasConfig = computed(() => homeUrl.value.trim().length > 0)
const browsing = computed(() => browsingMode.value)

/**
 * 当前节点的身份标签（给 header 视觉标记用）：
 * 独立模式 → 空字符串（不显示）
 * 共享模式 → 身份名称
 */
const identityLabel = computed(() => {
  if (!browserNode.value) return ''
  const id = browserNode.value.currentIdentityId
  if (!id) return ''
  return allIdentities.value.find((i) => i.id === id)?.name ?? ''
})

/** 身份选择下拉框是否展开 */
const identityMenuOpen = ref(false)

/** 切换身份：下拉框里点某个选项时调这个 */
function onSelectIdentity(id: string | undefined): void {
  identityMenuOpen.value = false
  if (!browserNode.value) return
  browserNode.value.setIdentity(id)
}

/** 点外部关闭下拉框 */
function closeIdentityMenu(): void {
  identityMenuOpen.value = false
}

// —— 地址栏：渲染层输入 → 写回节点持久化 homeUrl ——

function commitAddress(): void {
  if (!browserNode.value) return
  const val = addressInput.value.trim()
  browserNode.value.setHomeUrl(val)
  syncFromNode(browserNode.value)
  // 节点持久化后 render.vue 等 onChanged 同步 resolvedUrl，然后导航
  navigateToResolved()
}

function onAddressKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitAddress()
  }
}

// —— 导航控制 ——

/**
 * 让 webview 加载当前 resolvedUrl。
 * 必须等 webview dom-ready 之后才能调 loadURL（Electron 硬要求），
 * initialSrc 方案保证首次渲染时就有真实 URL，dom-ready 一定会在
 * addEventListener 之后触发。用户后续输入导航也会在 webviewReady=true 之后。
 */
function navigateToResolved(): void {
  if (!browserNode.value) {
    // eslint-disable-next-line no-console
    console.warn('[BrowserNode] navigateToResolved: 无 browserNode，跳过')
    return
  }
  const url = browserNode.value.displayResolvedUrl.trim()
  // eslint-disable-next-line no-console
  console.log('[BrowserNode] navigateToResolved', { url, webviewReady: webviewReady.value, hasEl: !!webviewEl.value })
  if (!url) return
  if (!browserNode.value.isValidUrl(url)) {
    // eslint-disable-next-line no-console
    console.warn('[BrowserNode] URL 无效:', url)
    browserNode.value.onWebviewFailLoading(t('urlInvalid'))
    return
  }

  if (!webviewReady.value || !webviewEl.value) {
    // eslint-disable-next-line no-console
    console.warn('[BrowserNode] webview 还没 ready，等 dom-ready 再加载')
    return
  }

  try {
    // eslint-disable-next-line no-console
    console.log('[BrowserNode] → loadURL', url)
    webviewEl.value.loadURL(url)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[BrowserNode] webview.loadURL failed:', err)
  }
}

function goBack(): void {
  if (webviewEl.value && canGoBack.value) {
    try { webviewEl.value.goBack() } catch { /* noop */ }
  }
}

function goForward(): void {
  if (webviewEl.value && canGoForward.value) {
    try { webviewEl.value.goForward() } catch { /* noop */ }
  }
}

function reload(): void {
  if (webviewEl.value) {
    try { webviewEl.value.reload() } catch { /* noop */ }
  }
}

// —— 浏览模式切换 ——

function toggleBrowsing(): void {
  browsingMode.value = !browsingMode.value
}

// —— Zoom 控制 ——

function applyZoom(): void {
  if (!webviewEl.value) return
  try {
    // eslint-disable-next-line no-console
    console.log('[BrowserNode] 🔍 setZoomFactor', zoomFactor.value)
    webviewEl.value.setZoomFactor(zoomFactor.value)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[BrowserNode] setZoomFactor failed:', err)
  }
}

function zoomIn(): void {
  browserNode.value?.setZoomFactor((browserNode.value.currentZoomFactor + 0.1))
}

function zoomOut(): void {
  browserNode.value?.setZoomFactor((browserNode.value.currentZoomFactor - 0.1))
}

function zoomReset(): void {
  browserNode.value?.setZoomFactor(1.0)
}

const zoomPercent = computed(() => `${Math.round(zoomFactor.value * 100)}%`)

// —— 用户脚本执行 ——

async function executeScript(script: ScriptItem): Promise<void> {
  if (!webviewEl.value) {
    lastScriptResult.value = { ok: false, text: 'webview 未就绪' }
    return
  }
  // eslint-disable-next-line no-console
  console.log('[BrowserNode] 🚀 执行脚本:', script.name, 'code:', script.code.slice(0, 80))
  try {
    const result = await webviewEl.value.executeJavaScript(script.code)
    const text = result === undefined ? '(undefined)' : JSON.stringify(result)
    // eslint-disable-next-line no-console
    console.log('[BrowserNode] 🚀 脚本结果:', text)
    lastScriptResult.value = { ok: true, text }
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[BrowserNode] 🚀 脚本报错:', err)
    lastScriptResult.value = { ok: false, text: String(err?.message ?? err) }
  }
}

function clearScriptResult(): void {
  lastScriptResult.value = null
}

// —— webview 事件处理 ——

function handleWebviewReady(): void {
  // eslint-disable-next-line no-console
  console.log('[BrowserNode] ✅ dom-ready', webviewEl.value?.src)
  // dom-ready 只作为确认，真正的 webviewReady 标志在 did-stop-loading 里设——
  // 因为 about:blank 的 dom-ready 会在 addEventListener 之前烧完，
  // 但 did-stop-loading 一定会在挂载后触发（哪怕是 about:blank）
}

function handleNavigate(_e: any, url: string): void {
  // eslint-disable-next-line no-console
  console.log('[BrowserNode] 🧭 did-navigate', url)
  if (!browserNode.value) return
  const wv = webviewEl.value
  const gb = wv?.canGoBack?.() ?? false
  const gf = wv?.canGoForward?.() ?? false
  browserNode.value.onWebviewNavigate(url, gb, gf)
  // 地址栏同步 webview 的真实 URL（允许被重定向过）
  currentUrl.value = url
  addressInput.value = url
}

function handleTitleUpdated(_e: any, titleText: string): void {
  // eslint-disable-next-line no-console
  console.log('[BrowserNode] 📄 page-title-updated', titleText)
  if (!browserNode.value) return
  browserNode.value.onWebviewTitle(titleText)
}

function handleStartLoading(): void {
  // eslint-disable-next-line no-console
  console.log('[BrowserNode] ⏳ did-start-loading')
  if (!browserNode.value) return
  browserNode.value.onWebviewStartLoading()
}

function handleStopLoading(): void {
  // eslint-disable-next-line no-console
  console.log('[BrowserNode] ✅ did-stop-loading')
  // ★ 关键：这里设 webviewReady=true
  // did-stop-loading 是 Electron webview 加载完成（包括 about:blank）的信号，
  // 它一定会在 addEventListener 之后触发——因为挂载 + 加载 about:blank 至少要走一轮事件循环。
  webviewReady.value = true

  if (!browserNode.value) return
  // 更新前进/后退状态
  const wv = webviewEl.value
  if (wv) {
    try {
      const gb = wv.canGoBack?.() ?? false
      const gf = wv.canGoForward?.() ?? false
      canGoBack.value = gb
      canGoForward.value = gf
    } catch { /* noop */ }
  }
  browserNode.value.onWebviewStopLoading()

  // 页面加载完成后应用缩放因子（首次加载 & 每次导航后都要重置）
  applyZoom()
}

function handleFailLoading(_e: any, code: number, description: string, failedUrl: string): void {
  // eslint-disable-next-line no-console
  console.error('[BrowserNode] ❌ did-fail-load', { code, description, failedUrl })
  if (!browserNode.value) return
  const msg = description || `Error ${code}`
  browserNode.value.onWebviewFailLoading(`${msg} (${failedUrl})`)
}

// —— 生命周期 ——

onMounted(() => {
  // eslint-disable-next-line no-console
  console.log('[BrowserNode] 🔧 onMounted start', { id: props.id })
  const found = workspaceScene.getNode(props.id)
  if (!(found instanceof BrowserNode)) {
    // eslint-disable-next-line no-console
    console.warn('[BrowserNode] 找不到 BrowserNode 实例', props.id)
    return
  }

  browserNode.value = found
  syncFromNode(found)
  addressInput.value = found.displayHomeUrl

  // ★ 在 nextTick 之前就锁定 initialSrc，让 <webview :src> 首次渲染时带上真实 URL。
  // 这是解决 dom-ready 时序问题的关键——about:blank 的 dom-ready 在 addEventListener
  // 之前就烧完了，但带真实 URL 的 webview 一定会在挂载后再发一次 dom-ready。
  initialSrc.value = found.displayResolvedUrl

  // eslint-disable-next-line no-console
  console.log('[BrowserNode] onMounted node ok', { homeUrl: found.displayHomeUrl, resolvedUrl: found.displayResolvedUrl, initialSrc: initialSrc.value })

  // 订阅节点变化
  unsubscribe = found.onChanged(() => {
    const prevZoom = zoomFactor.value
    const prevPartition = partition.value
    syncFromNode(found)

    // —— identity 变化 → partition 变化 → 必须重建 webview ——
    if (partition.value !== prevPartition) {
      // eslint-disable-next-line no-console
      console.log('[BrowserNode] partition 变化 → 重建 webview', { from: prevPartition, to: partition.value })
      webviewKey.value += 1
      webviewReady.value = false
      // 重置导航状态，等新 webview 的 did-stop-loading 来驱动
      status.value = 'idle'
      currentUrl.value = ''
      canGoBack.value = false
      canGoForward.value = false
      // initialSrc 在模板 diff 时被新 webview 绑定，重新触发导航
      nextTick(() => navigateToResolved())
      return // 下面的 zoom/navigate 逻辑是给稳定态用的，重建后等新的 onChanged 再走
    }

    // zoom 变化 → 立即应用（不需要等 did-stop-loading）
    if (zoomFactor.value !== prevZoom && webviewReady.value) {
      applyZoom()
    }
    // MethodPort navigate 触发 → 序号变化 → 导航
    const seq = found.consumeNavigateRequestSeq()
    if (seq !== lastNavigateSeq) {
      lastNavigateSeq = seq
      // eslint-disable-next-line no-console
      console.log('[BrowserNode] MethodPort navigate 触发, seq=', seq)
      // 等 webview 可能刚挂载好
      nextTick(() => navigateToResolved())
    }
  })

  // 身份选择下拉框：点外部关闭
  const onDocClickForIdentity = (): void => {
    if (identityMenuOpen.value) identityMenuOpen.value = false
  }
  document.addEventListener('click', onDocClickForIdentity)

  // webview DOM 在 <webview ref="webviewEl" /> 渲染后就绪
  // Vue 的 ref 在模板渲染完成后自动赋值，但 <webview> 是自定义元素，
  // 需要等它的 dom-ready 事件才能安全调用 loadURL
  nextTick(() => {
    const wv = webviewEl.value
    // eslint-disable-next-line no-console
    console.log('[BrowserNode] nextTick webviewEl=', !!wv, wv?.tagName, wv?.src)
    if (!wv) return

    wv.addEventListener('dom-ready', handleWebviewReady)
    wv.addEventListener('did-navigate', handleNavigate)
    wv.addEventListener('did-navigate-in-page', handleNavigate)
    wv.addEventListener('page-title-updated', handleTitleUpdated)
    wv.addEventListener('did-start-loading', handleStartLoading)
    wv.addEventListener('did-stop-loading', handleStopLoading)
    wv.addEventListener('did-fail-load', handleFailLoading)
    // eslint-disable-next-line no-console
    console.log('[BrowserNode] ✅ 所有事件监听器已挂载')
  })
})

onUnmounted(() => {
  unsubscribe?.()

  // 清理身份选择下拉框的文档级点击监听
  document.removeEventListener('click', onDocClickForIdentity)

  // 清理 webview 事件监听 + 销毁实例
  const wv = webviewEl.value
  if (wv) {
    wv.removeEventListener('dom-ready', handleWebviewReady)
    wv.removeEventListener('did-navigate', handleNavigate)
    wv.removeEventListener('did-navigate-in-page', handleNavigate)
    wv.removeEventListener('page-title-updated', handleTitleUpdated)
    wv.removeEventListener('did-start-loading', handleStartLoading)
    wv.removeEventListener('did-stop-loading', handleStopLoading)
    wv.removeEventListener('did-fail-load', handleFailLoading)
    try { wv.destroy?.() } catch { /* noop */ }
  }

  // 清理 resize 事件监听
  if (resizeState.value?.cleanup) resizeState.value.cleanup()
})
</script>

<template>
  <div class="browser-node">
    <!-- —— 节点头部 —— -->
    <NodeHeader :title="nodeTitle" hide-help>
      <template #actions>
        <button
          v-if="browserNode"
          class="browser-gear"
          type="button"
          :title="t('helpTitle')"
          @pointerdown.stop
          @click.stop="openNodeDetail(id)"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- —— 身份指示行（仅共享模式显示） —— -->
    <div
      v-if="browserNode && identityLabel"
      class="browser-identity-indicator"
      :title="identityLabel"
    >
      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
      </svg>
      <span>{{ identityLabel }}</span>
    </div>

    <!-- —— 工具栏 —— -->
    <div v-if="browserNode" class="browser-toolbar">
      <!-- 导航按钮组 -->
      <div class="browser-toolbar__nav">
        <button
          class="browser-btn"
          type="button"
          :title="t('back')"
          :disabled="!canGoBack"
          @pointerdown.stop
          @click.stop="goBack"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button
          class="browser-btn"
          type="button"
          :title="t('forward')"
          :disabled="!canGoForward"
          @pointerdown.stop
          @click.stop="goForward"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button
          class="browser-btn"
          type="button"
          :title="t('reload')"
          @pointerdown.stop
          @click.stop="reload"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
      </div>

      <!-- 地址栏 -->
      <div class="browser-toolbar__address">
        <input
          v-model="addressInput"
          class="browser-address"
          :class="{ 'browser-address--error': status === 'error' }"
          type="text"
          :placeholder="t('urlPlaceholder')"
          @pointerdown.stop
          @keydown.stop="onAddressKeydown"
          @blur="commitAddress"
        />
        <span v-if="status === 'error'" class="browser-address__error" :title="lastError">!</span>
        <span v-else-if="loading" class="browser-address__loading" />
      </div>

      <!-- Zoom 控件 -->
      <div class="browser-toolbar__zoom">
        <button
          class="browser-zoom-btn"
          type="button"
          title="缩小"
          @pointerdown.stop
          @click.stop="zoomOut"
        >−</button>
        <button
          class="browser-zoom-label"
          type="button"
          title="点击重置为 100%"
          @pointerdown.stop
          @click.stop="zoomReset"
        >{{ zoomPercent }}</button>
        <button
          class="browser-zoom-btn"
          type="button"
          title="放大"
          @pointerdown.stop
          @click.stop="zoomIn"
        >＋</button>
      </div>

      <!-- 身份选择 -->
      <div class="browser-toolbar__identity" @pointerdown.stop>
        <button
          class="browser-identity-btn"
          type="button"
          :title="identityLabel ? `身份: ${identityLabel}` : '独立浏览器会话'"
          @click.stop="identityMenuOpen = !identityMenuOpen"
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
          </svg>
        </button>
        <!-- 下拉菜单 -->
        <div
          v-if="identityMenuOpen"
          class="browser-identity-menu"
          @click.stop
        >
          <button
            class="browser-identity-option"
            type="button"
            :class="{ 'browser-identity-option--active': !browserNode?.currentIdentityId }"
            @click="onSelectIdentity(undefined)"
          >
            <span class="browser-identity-option__check">{{ !browserNode?.currentIdentityId ? '✓' : '' }}</span>
            <span>独立</span>
          </button>
          <template v-if="allIdentities.length > 0">
            <div class="browser-identity-divider" />
            <button
              v-for="id in allIdentities"
              :key="id.id"
              class="browser-identity-option"
              type="button"
              :class="{ 'browser-identity-option--active': browserNode?.currentIdentityId === id.id }"
              @click="onSelectIdentity(id.id)"
            >
              <span class="browser-identity-option__check">{{ browserNode?.currentIdentityId === id.id ? '✓' : '' }}</span>
              <span>{{ id.name }}</span>
            </button>
          </template>
        </div>
      </div>

      <!-- 浏览模式切换 -->
      <button
        class="browser-mode"
        type="button"
        :class="{ 'browser-mode--active': browsing }"
        :title="browsing ? t('browsingHint') : t('browseOn')"
        @pointerdown.stop
        @click.stop="toggleBrowsing"
      >
        {{ browsing ? t('browseOff') : t('browseOn') }}
      </button>
    </div>

    <!-- —— 用户脚本按钮条（动态，detailPanel 里增删） —— -->
    <div
      v-if="browserNode && scripts.length > 0"
      class="browser-scripts"
    >
      <button
        v-for="s in scripts"
        :key="s.id"
        class="browser-script-btn"
        type="button"
        :title="s.code"
        @pointerdown.stop
        @click.stop="executeScript(s)"
      >{{ s.name }}</button>
    </div>

    <!-- 脚本执行结果（可关闭） -->
    <div
      v-if="lastScriptResult"
      class="browser-script-result"
      :class="{ 'browser-script-result--error': !lastScriptResult.ok }"
    >
      <span class="browser-script-result__text">{{ lastScriptResult.text }}</span>
      <button
        class="browser-script-result__close"
        type="button"
        title="关闭"
        @pointerdown.stop
        @click.stop="clearScriptResult"
      >×</button>
    </div>

    <!-- —— webview 容器 —— -->
    <div
      v-if="browserNode"
      class="browser-content"
      :class="{ 'browser-content--browsing': browsing }"
    >
      <!-- 默认遮罩：浏览模式关闭时，pointer-events:none 让画布事件穿透 -->
      <webview
        :key="webviewKey"
        ref="webviewEl"
        class="browser-webview"
        :class="{ 'browser-webview--browsing': browsing }"
        :src="initialSrc"
        :partition="partition"
        nodeintegration="false"
      />

      <!-- 空态 / 错误态遮罩（webview 上方，默认和浏览模式都显示） -->
      <div v-if="!hasConfig" class="browser-overlay">
        <span>{{ t('urlEmpty') }}</span>
      </div>
      <div v-else-if="status === 'error'" class="browser-overlay browser-overlay--error">
        <span>{{ lastError || t('urlInvalid') }}</span>
      </div>
    </div>

    <!-- —— Resize handle（右下角小三角） —— -->
    <div
      v-if="browserNode"
      class="browser-resize-handle"
      :title="'拖拽调整尺寸'"
      @pointerdown="onResizeHandlePointerDown"
    />
  </div>
</template>

<style scoped lang="less">
.browser-node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 6px;
  padding-top: 0;
  gap: 5px;
  overflow: hidden;
  position: relative; // 让 resize-handle 的 absolute 相对它定位

  // 齿轮图标
  &-gear {
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #9ca3af;
    flex-shrink: 0;

    svg { width: 12px; height: 12px; }
  }
}

// —— 工具栏 ——

.browser-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  background: #f8fafc;
  border: 1px solid @node-border-color;
  border-radius: 6px;

  &__nav {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  &__address {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    position: relative;
  }
}

.browser-btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  color: #4b5563;
  transition: background 0.15s;

  &:hover:not(:disabled) { background: #e2e8f0; }
  &:active:not(:disabled) { background: #cbd5e1; }
  &:disabled { cursor: not-allowed; color: #d1d5db; }
}

.browser-address {
  width: 100%;
  height: 24px;
  padding: 0 6px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #1f2937;
  background: #fff;
  outline: none;
  box-sizing: border-box;
  min-width: 0;

  &:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
  &--error { border-color: #fca5a5; background: #fef2f2; color: #dc2626; }

  &__error {
    position: absolute;
    right: 4px;
    font-size: 11px;
    font-weight: 700;
    color: #dc2626;
  }

  &__loading {
    position: absolute;
    right: 4px;
    width: 10px;
    height: 10px;
    border: 2px solid #bfdbfe;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
}

// —— Zoom 控件 ——

.browser-toolbar__zoom {
  display: flex;
  align-items: center;
  gap: 1px;
  flex-shrink: 0;
}

.browser-zoom-btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  color: #4b5563;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  transition: background 0.15s;

  &:hover { background: #e2e8f0; }
  &:active { background: #cbd5e1; }
}

.browser-zoom-label {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 500;
  color: #4b5563;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  border-radius: 4px;
  transition: background 0.15s;
  user-select: none;

  &:hover { background: #e2e8f0; }
}

.browser-mode {
  all: unset;
  cursor: pointer;
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #4b5563;
  background: #e2e8f0;
  transition: background 0.15s, color 0.15s;
  user-select: none;

  &:hover { background: #cbd5e1; }

  &--active {
    background: #3b82f6;
    color: #fff;
  }
}

// —— 用户脚本按钮条 ——

.browser-scripts {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 0 2px;
  flex-shrink: 0;
}

.browser-script-btn {
  all: unset;
  cursor: pointer;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 500;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 3px;
  line-height: 1.4;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background 0.15s;
  user-select: none;

  &:hover { background: #dbeafe; }
  &:active { background: #bfdbfe; }
}

.browser-script-result {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
  border-radius: 3px;
  flex-shrink: 0;
  max-height: 40px;
  overflow: hidden;

  &--error {
    background: #fef2f2;
    color: #dc2626;
    border-color: #fecaca;
  }

  &__text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
  }

  &__close {
    all: unset;
    cursor: pointer;
    color: inherit;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;
    padding: 0 2px;
    &:hover { opacity: 0.7; }
  }
}

// —— webview 容器 ——

.browser-content {
  flex: 1;
  min-height: 0;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  background: #fff;

  &--browsing {
    // 浏览模式下给 webview 更多视觉层级
    box-shadow: inset 0 0 0 2px #3b82f6;
  }
}

.browser-webview {
  width: 100%;
  height: 100%;
  border: none;
  display: flex;
  // 默认不拦截画布事件 —— 节点拖拽、连线、选中全正常
  pointer-events: none;

  &--browsing {
    // 浏览模式下 webview 捕获所有指针事件
    pointer-events: auto;
  }
}

.browser-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #9ca3af;
  background: #fafbfc;
  font-family: inherit;
  text-align: center;
  padding: 16px;

  &--error {
    color: #dc2626;
    background: #fef2f2;
  }
}

// —— Resize handle ——

.browser-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
  // 右下角三角：用渐变画，简洁不依赖额外元素
  background: linear-gradient(
    135deg,
    transparent 0%,
    transparent 40%,
    #c7cdd4 40%,
    #c7cdd4 48%,
    transparent 48%,
    transparent 60%,
    #c7cdd4 60%,
    #c7cdd4 72%,
    transparent 72%
  );
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
  pointer-events: auto; // 覆盖上层可能的 pointer-events:none

  &:hover {
    opacity: 1;
  }

  // 鼠标悬停节点容器时显示
  .browser-node:hover & {
    opacity: 0.6;
  }
}

// —— 身份指示行（header 与 toolbar 之间的小徽章） ——
.browser-identity-indicator {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px;
  margin: 0 2px;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 10px;
  font-weight: 500;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// —— 身份选择按钮 + 下拉菜单 ——
.browser-toolbar__identity {
  position: relative;
  flex-shrink: 0;
}

.browser-identity-btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  color: #4b5563;
  transition: background 0.15s;

  &:hover { background: #e2e8f0; }
}

.browser-identity-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 160px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 100;
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.browser-identity-option {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: #374151;
  transition: background 0.1s;

  &:hover { background: #eff6ff; }

  &--active {
    background: #eff6ff;
    color: #2563eb;
    font-weight: 500;
  }

  &__check {
    width: 14px;
    font-size: 11px;
    color: #2563eb;
    flex-shrink: 0;
  }
}

.browser-identity-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
