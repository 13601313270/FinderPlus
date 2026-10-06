<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { NumberDisplayNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { viewport } from '@renderer/canvas/viewport'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NumberDisplayHelpDialog from './NumberDisplayHelpDialog.vue'

/**
 * 数字展示节点的渲染组件（只画卡片内容）。
 *
 * 定位、两侧端口这些所有节点共用的东西由 NodeShell 兜底，这里不碰。
 *
 * 引擎里的 displayed 只是普通类字段，Vue 追踪不到，所以不能靠 computed 自动刷新。
 * 这里在挂载时拿到活引用，订阅 node.onChanged —— 上游把新值推进来、节点刷新后，
 * 回调里把 number 写进本地 ref，Vue 才会重渲染。
 */
const props = defineProps<{ id: string }>()

// 用 shallowRef 而不是 ref：ref 会把节点实例深转换成 reactive 代理，于是从这里读到的
// 端口对象不再是引擎里那个端口（按身份比对的连线层会认不出来）。引擎对象有自己的一套
// 通知机制（onChanged），本来也不需要 Vue 去代理它，这里只关心「引用换没换」。
const displayNode = shallowRef<NumberDisplayNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => displayNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// null 表示还没收到值，用来区分「数字 0」和「暂无输出」
const value = ref<number | null>(null)

// 数字颜色（节点自带设置，随节点持久化）
const color = ref('#1f2329')

// 设置覆层开关
const showSettings = ref(false)

/** 预设色板，第一个是默认的正文色 */
const PRESET_COLORS = [
  '#1f2329',
  '#8a9099',
  '#e5484d',
  '#e8890c',
  '#f5a524',
  '#30a46c',
  '#0091ff',
  '#3b7cff',
  '#8e4ec6'
]

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

/** 应用颜色：先更新本地即时反馈，再写回节点（节点 notifyChanged 后 onChanged 会再同步一次） */
function applyColor(next: string): void {
  color.value = next
  displayNode.value?.setNumberColor(next)
}

/** 原生取色器输入：input 事件给的是 #rrggbb */
function onColorInput(e: Event): void {
  applyColor((e.target as HTMLInputElement).value)
}

// —— 数字自适应：随卡片尺寸放大到刚好填满展示区（取宽/高两个方向的较小者），并居中 ——
const displayEl = ref<HTMLElement | null>(null)
const rulerEl = ref<HTMLElement | null>(null)
const fontSize = ref(20)
const MIN_FONT = 12

/**
 * 用一把 100px 的隐藏「尺子」（同字体、同行高、同 tabular-nums）量出文字在 100px 下的宽度，
 * 再按展示区内宽等比缩放。行高固定为 1，所以高度方向可行的字号就是内高本身。
 * 取两者较小值即「撑到最大且不溢出」，不用反复改可见文字，避免闪烁。
 */
function fitFont(): void {
  const el = displayEl.value
  const ruler = rulerEl.value
  if (!el || !ruler) return
  if (value.value === null) return

  const cs = getComputedStyle(el)
  const innerW = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  const innerH = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
  const widthAt100 = ruler.offsetWidth || 1

  const byWidth = (innerW * 100) / widthAt100
  const byHeight = innerH
  fontSize.value = Math.max(MIN_FONT, Math.floor(Math.min(byWidth, byHeight)))
}

let resizeObserver: ResizeObserver | undefined

let unsubscribe: (() => void) | undefined

// 只要拖拽（落点写回 node.position）；位置本身由外壳跟随 node.position 展示。
const { startDrag } = useNodePosition(() => displayNode.value)

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof NumberDisplayNode) {
    displayNode.value = found
    value.value = found.number
    color.value = found.numberColor
    unsubscribe = found.onChanged(() => {
      value.value = found.number
      color.value = found.numberColor
    })
  }

  // 展示区尺寸变了（拖右下角缩放、或外壳布局变化）就重新算字号
  if (displayEl.value) {
    resizeObserver = new ResizeObserver(() => fitFont())
    resizeObserver.observe(displayEl.value)
  }
  fitFont()
})

// 数字本身变了（位数变化）也要重新算字号；等 DOM 里的尺子同步后再量
watch(value, () => {
  nextTick(fitFont)
})

onUnmounted(() => {
  unsubscribe?.()
  resizeObserver?.disconnect()
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
          class="node__icon-btn"
          type="button"
          :title="t('settingsHint')"
          @pointerdown.stop
          @click.stop="showSettings = !showSettings"
        >
          <svg
            class="node__gear"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          class="node__icon-btn"
          type="button"
          :title="t('helpTitle')"
          @pointerdown.stop
          @click.stop="showHelp = true"
        >?</button>
      </div>
    </div>
    <div ref="displayEl" class="render-display">
      <span
        v-if="value !== null"
        class="render-display__value"
        :style="{ fontSize: fontSize + 'px', color }"
      >{{ value }}</span>
      <span v-else class="render-display__placeholder">
        {{ displayNode ? t('empty') : t('nodeMissing') }}
      </span>
      <!-- 隐藏尺子：与可见数字同字体同字号基准（100px），只用于量宽，不参与视觉 -->
      <span ref="rulerEl" class="render-display__ruler" aria-hidden="true">{{ value ?? '' }}</span>
    </div>
    <div
      v-if="displayNode"
      class="node__resize-handle"
      @pointerdown.stop.prevent="onResizePointerDown"
      :title="t('resizeHint')"
    />

    <!-- 设置覆层：覆盖整张卡片，点空白处或右上角 × 关闭 -->
    <div
      v-if="showSettings"
      class="node__settings"
      @pointerdown.stop
      @click.self="showSettings = false"
    >
      <div class="node__settings-panel">
        <div class="node__settings-head">
          <span>{{ t('settingsTitle') }}</span>
          <button class="node__settings-close" type="button" @click.stop="showSettings = false">×</button>
        </div>
        <div class="node__swatches">
          <button
            v-for="c in PRESET_COLORS"
            :key="c"
            class="node__swatch"
            :class="{ 'node__swatch--active': color.toLowerCase() === c.toLowerCase() }"
            type="button"
            :style="{ background: c }"
            :title="c"
            @click.stop="applyColor(c)"
          />
        </div>
        <label class="node__custom">
          <span>{{ t('customLabel') }}</span>
          <input class="node__color-input" type="color" :value="color" @input="onColorInput" />
        </label>
      </div>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <NumberDisplayHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: hidden;
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

  &__actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__icon-btn {
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

  &__gear {
    width: 12px;
    height: 12px;
  }

  // 设置覆层：盖住整张卡片，贴在 .node 内（.node-content 会裁剪，所以不能做浮动弹层）
  &__settings {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    background: rgba(255, 255, 255, 0.94);
    border-radius: 8px;
    overflow: auto;
  }

  &__settings-panel {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__settings-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 600;
    color: @color-text;
  }

  &__settings-close {
    all: unset;
    cursor: pointer;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #6b7280;
    font-size: 14px;
    line-height: 1;

    &:hover {
      background: #f3f4f6;
      color: #1f2329;
    }
  }

  &__swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__swatch {
    all: unset;
    cursor: pointer;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.12);
    box-sizing: border-box;

    &--active {
      box-shadow: 0 0 0 2px #dbeafe;
      border-color: #2563eb;
    }
  }

  &__custom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: @color-text-weak;
  }

  &__color-input {
    width: 28px;
    height: 20px;
    padding: 0;
    border: 1px solid @node-border-color;
    border-radius: 4px;
    background: none;
    cursor: pointer;
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
  position: relative;
  padding: 8px 10px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  // 可见数字：字号由 fitFont 按展示区尺寸算，颜色由设置覆层决定（都走行内 style）
  &__value {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    white-space: nowrap;
  }

  &__placeholder {
    font-size: 14px;
    color: #9aa2ad;
    font-style: italic;
  }

  // 量宽用的隐藏尺子：与可见数字同字体、同行高，固定 100px 基准
  &__ruler {
    position: absolute;
    left: 0;
    top: 0;
    visibility: hidden;
    pointer-events: none;
    white-space: nowrap;
    font-size: 100px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
}
</style>
