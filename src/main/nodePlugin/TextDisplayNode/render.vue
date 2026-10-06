<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TextDisplayNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { viewport } from '@renderer/canvas/viewport'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import TextDisplayHelpDialog from './TextDisplayHelpDialog.vue'

/**
 * 文本展示节点的渲染组件（只画卡片内容）。
 *
 * 定位、两侧端口这些所有节点共用的东西由 NodeShell 兜底，这里不碰。
 *
 * 引擎里的 displayed 只是普通类字段，Vue 追踪不到，所以不能靠 computed 自动刷新。
 * 这里在挂载时拿到活引用，订阅 node.onChanged —— 上游把新值推进来、节点刷新后，
 * 回调里把 text 写进本地 ref，Vue 才会重渲染。
 */
const props = defineProps<{ id: string }>()

// 用 shallowRef 而不是 ref：ref 会把节点实例深转换成 reactive 代理，于是从这里读到的
// 端口对象不再是引擎里那个端口（按身份比对的连线层会认不出来）。引擎对象有自己的一套
// 通知机制（onChanged），本来也不需要 Vue 去代理它，这里只关心「引用换没换」。
const displayNode = shallowRef<TextDisplayNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => displayNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)
const text = ref('')

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

// 全屏预览浮层开关
const showPreview = ref(false)

// —— 虚拟滚动条相关状态 ——
const renderDisplayRef = ref<HTMLElement | null>(null)
const contentScrollTop = ref(0)
const contentScrollHeight = ref(0)
const contentClientHeight = ref(0)

/** 内容是否可滚动（有溢出才显示滚动条） */
const isScrollable = () => contentScrollHeight.value > contentClientHeight.value + 1

/** 刷新滚动指标：scrollTop/scrollHeight/clientHeight */
function updateScrollMetrics(): void {
  const el = renderDisplayRef.value
  if (!el) return
  contentScrollTop.value = el.scrollTop
  contentScrollHeight.value = el.scrollHeight
  contentClientHeight.value = el.clientHeight
}

// —— ResizeObserver：尺寸变化时更新滚动指标 ——
let resizeObserver: ResizeObserver | undefined

// —— 虚拟滚动条拖动 ——
let scrollDragActive = false
let scrollDragStartY = 0
let scrollDragStartTop = 0

function onThumbPointerDown(e: PointerEvent): void {
  e.stopPropagation()
  e.preventDefault()
  if (!renderDisplayRef.value) return

  scrollDragActive = true
  scrollDragStartY = e.clientY
  scrollDragStartTop = renderDisplayRef.value.scrollTop

  window.addEventListener('pointermove', onScrollThumbMove)
  window.addEventListener('pointerup', onScrollThumbEnd)
}

/** track 的实际高度：render-display 高度 - top 2px - bottom 14px */
function trackHeightPx(): number {
  return Math.max(0, contentClientHeight.value - 16)
}

function onScrollThumbMove(e: PointerEvent): void {
  if (!scrollDragActive || !renderDisplayRef.value) return
  const el = renderDisplayRef.value

  // 画布缩放比例必须除掉，否则手指移 1px 对应不了实际滚动像素
  const scale = viewport.scale || 1
  const fullScroll = contentScrollHeight.value - contentClientHeight.value
  const thumbHeightPx = thumbHeight()
  const trackUsable = trackHeightPx() - thumbHeightPx

  if (trackUsable <= 0) return
  const ratio = fullScroll / trackUsable

  const delta = (e.clientY - scrollDragStartY) / scale
  el.scrollTop = Math.max(0, Math.min(fullScroll, scrollDragStartTop + delta * ratio))
  updateScrollMetrics()
}

function onScrollThumbEnd(): void {
  scrollDragActive = false
  window.removeEventListener('pointermove', onScrollThumbMove)
  window.removeEventListener('pointerup', onScrollThumbEnd)
}

/** 滚动条 thumb 的像素高度（映射到 track 高度） */
function thumbHeight(): number {
  if (contentScrollHeight.value <= 0 || contentClientHeight.value <= 0) return 0
  const ratio = contentClientHeight.value / contentScrollHeight.value
  const min = 20
  return Math.max(min, trackHeightPx() * ratio)
}

/** 滚动条 thumb 的 top 偏移（映射滚动比例，基于 track 实际高度） */
function thumbTop(): number {
  const fullScroll = contentScrollHeight.value - contentClientHeight.value
  if (fullScroll <= 0) return 0
  const trackUsable = trackHeightPx() - thumbHeight()
  return (contentScrollTop.value / fullScroll) * trackUsable
}

let unsubscribe: (() => void) | undefined

// 只要拖拽（落点写回 node.position）；位置本身由外壳跟随 node.position 展示。
const { startDrag } = useNodePosition(() => displayNode.value)

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof TextDisplayNode) {
    displayNode.value = found
    text.value = found.text
    unsubscribe = found.onChanged(() => {
      text.value = found.text
    })
  }

  // 等 DOM 渲染完，绑定 scroll 监听 + ResizeObserver，刷新滚动指标
  nextTick(() => {
    const el = renderDisplayRef.value
    if (!el) return
    el.addEventListener('scroll', updateScrollMetrics, { passive: true })
    resizeObserver = new ResizeObserver(updateScrollMetrics)
    resizeObserver.observe(el)
    updateScrollMetrics()
  })
})

// 文本变了（内容变长/变短）也要刷新滚动指标
watch(text, () => {
  nextTick(updateScrollMetrics)
})

onUnmounted(() => {
  unsubscribe?.()
  resizeObserver?.disconnect()
  renderDisplayRef.value?.removeEventListener('scroll', updateScrollMetrics)
  onScrollThumbEnd() // 防御：拖到一半卸载时清监听
})

// —— resize handle 拖拽：右下角双向自由调整宽高，不锁比例 ——
const MIN_WIDTH = 160
const MAX_WIDTH = 800
const MIN_HEIGHT = 80
const MAX_HEIGHT = 600

function onResizePointerDown(e: PointerEvent): void {
  const n = displayNode.value
  if (!n) return
  e.stopPropagation()
  e.preventDefault()

  const startClientX = e.clientX
  const startClientY = e.clientY
  const [startWidth, startHeight] = n.box

  function move(ev: PointerEvent): void {
    const cur = displayNode.value
    if (!cur) { end(); return }
    const scale = viewport.scale || 1
    const deltaW = (ev.clientX - startClientX) / scale
    const deltaH = (ev.clientY - startClientY) / scale
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(startWidth + deltaW)))
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(startHeight + deltaH)))
    cur.setBox(newWidth, newHeight)
  }
  function end(): void {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}
</script>

<template>
  <div class="node" @pointerdown="startDrag">
    <div class="node__header">
      <span class="node__handle" :title="t('dragHint')">{{ nodeTitle }}</span>
      <div class="node__actions">
        <button
          class="node__help"
          type="button"
          :title="t('previewHint')"
          @pointerdown.stop
          @click.stop="showPreview = true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
        </button>
        <button
          class="node__help"
          type="button"
          :title="t('helpTitle')"
          @click.stop="showHelp = true"
        >?</button>
      </div>
    </div>
    <div class="render-display-container">
      <div
        ref="renderDisplayRef"
        class="render-display"
        :class="{ 'render-display--empty': !text }"
        @wheel.prevent
      >
        {{ text || (displayNode ? t('empty') : t('nodeMissing')) }}
      </div>
      <!-- 虚拟滚动条：只在有溢出时显示，thumb 可拖动 -->
      <div
        v-if="isScrollable()"
        class="virtual-scroll-track"
      >
        <div
          class="virtual-scroll-thumb"
          :style="{ height: thumbHeight() + 'px', transform: 'translateY(' + thumbTop() + 'px)' }"
          @pointerdown.stop.prevent="onThumbPointerDown"
        />
      </div>
    </div>
    <div
      v-if="displayNode"
      class="node__resize-handle"
      @pointerdown.stop.prevent="onResizePointerDown"
      :title="t('resizeHint')"
    />
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <TextDisplayHelpDialog />
  </HelpDialog>

  <!-- 全屏文本预览：宽 90vw，dialog body 自带 overflow-y:auto 可滚动 -->
  <HelpDialog :visible="showPreview" :title="t('previewDialogTitle')" width="90vw" @close="showPreview = false">
    <pre class="preview-content">{{ text || (displayNode ? t('empty') : t('nodeMissing')) }}</pre>
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: hidden; // 外层不滚，滚动能力在内部 .render-display 里
  position: relative; // resize handle 绝对定位锚点
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  padding-top: 0;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px dashed @node-border-color;
    flex-shrink: 0;
  }

  &__handle {
    cursor: grab;
    user-select: none;
    font-size: 12px;
    color: @color-text-weak;
    text-align: center;

    &:active {
      cursor: grabbing;
    }
  }

  &__help {
    all: unset;
    cursor: pointer;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    svg {
      width: 12px;
      height: 12px;
    }

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__resize-handle {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
    background: transparent;
    border-right: 2px solid #b0b7c3;
    border-bottom: 2px solid #b0b7c3;
    border-bottom-right-radius: 4px;
  }
}

// 外层容器：position relative 用来锚定绝对定位的虚拟滚动条
.render-display-container {
  position: relative;
  flex: 1;
  min-height: 0; // flex 子项允许收缩，否则 overflow 不生效
}

.render-display {
  height: 100%;
  padding: 8px 10px;
  padding-right: 12px; // 给滚动条留一点呼吸空间（滚动条覆盖在最右，不需要真正占位）
  border: 1px solid @node-border-color;
  border-radius: 6px;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-y: auto;
  // 隐藏原生滚动条，保留滚动功能
  scrollbar-width: none;          // Firefox
  &::-webkit-scrollbar {          // Chrome / Safari / Electron
    display: none;
  }

  &--empty {
    color: #9aa2ad;
    font-style: italic;
  }
}

// 虚拟滚动条轨道：绝对定位贴在右侧，留出右下角 resize handle 的 14px 空间
.virtual-scroll-track {
  position: absolute;
  top: 2px;
  right: 2px;
  bottom: 14px; // 避开右下角 resize handle（right/bottom 各 2px，12px 宽）
  width: 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.12);
  pointer-events: none; // 轨道本身不吃事件，只让 thumb 可点
  opacity: 1;
  transition: background 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.18);
  }
}

.virtual-scroll-thumb {
  position: absolute;
  left: 0;
  width: 100%;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.32);
  cursor: pointer;
  pointer-events: auto;

  &:hover {
    background: rgba(0, 0, 0, 0.48);
  }

  &:active {
    background: rgba(0, 0, 0, 0.6);
  }
}

// 全屏预览弹窗里的文本：pre-wrap 保留换行/空格，清除 pre 默认 margin
.preview-content {
  margin: 0;
  padding: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #1f2329;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
}
</style>
