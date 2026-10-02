<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
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
})

onUnmounted(() => {
  unsubscribe?.()
})

/**
 * 滚动接力：显示区域还能往当前方向滚时 stop 事件，
 * 滚到顶/底了就放行让画布接管平移。
 */
function onNodeWheel(e: WheelEvent): void {
  const el = e.currentTarget as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = el
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight

  const scrollingUp = e.deltaY < 0
  const scrollingDown = e.deltaY > 0

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return

  e.stopPropagation()
}

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
      <button
        class="node__help"
        type="button"
        :title="t('helpTitle')"
        @click.stop="showHelp = true"
      >?</button>
    </div>
    <div class="render-display" @wheel="onNodeWheel" :class="{ 'render-display--empty': !text }">
      {{ text || (displayNode ? t('empty') : t('nodeMissing')) }}
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
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: auto; // 文本可长，超出 box 时在框内滚动
  position: relative; // resize handle 绝对定位锚点
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  padding-top: 0;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px dashed #d5d9e0;
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

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
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

.render-display {
  padding: 8px 10px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1;
  overflow: auto;

  &--empty {
    color: #9aa2ad;
    font-style: italic;
  }
}
</style>
