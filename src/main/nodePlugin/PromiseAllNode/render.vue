<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { PromiseAllNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import PromiseAllHelpDialog from './PromiseAllHelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'

/**
 * PromiseAll 汇合节点的渲染组件。
 *
 * 布局：rows 绝对定位铺满 space-evenly（和 NodeShell ports-col 对齐）；
 * header / actions 绝对定位浮层。
 *
 * 动画：引擎 triggering=true 时（commit 已做、receivedSet 暂未清），
 * nextTick 后从 rows 的 DOM rects 读每行中心 Y，生成 N 条贝塞尔 path，
 * SVG 里用 animateMotion 驱动小圆点沿路径从左飞到右。
 * ANIMATION_MS 后引擎 clear receivedSet 并重置 triggering=false，SVG 消失。
 */
const props = defineProps<{ id: string }>()

const promiseNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof PromiseAllNode ? node : undefined
})

const nodeTitle = useNodeTitle(() => promiseNode.value, '?')
const t = useLocalizedMessages(messages)

/** 帮助浮层开关 */
const showHelp = ref(false)

/** 当前端口对数量 */
const portCount = ref(2)

/** 当前已就绪端口数量 */
const readyCount = ref(0)

/** 每个端口对的就绪状态快照 */
const portStates = ref<boolean[]>([])

/** 是否处于 SVG 动画播放中（引擎 triggering 状态同步过来） */
const triggering = ref(false)

/** SVG 数据流动画时长——从引擎常量读，和引擎 setTimeout 对齐 */
const flowAnimMs = PromiseAllNode.FLOW_ANIMATION_MS

/** 每行 row 的 DOM 引用 —— v-for 里用 :ref 收集 */
const rowRefs = ref<HTMLDivElement[]>([])

/**
 * SVG 里要画的 N 条贝塞尔 path。
 * triggering 变 true 时生成；变 false 时清空。
 * 每条 path 对应一个端口对，起点是第 i 行的中心 Y（左侧），终点是右侧同 Y。
 */
const flowPaths = ref<string[]>([])
const svgWidth = ref(0)
const svgHeight = ref(0)

let offChanged: (() => void) | undefined

/** 从节点引擎拉一次完整状态快照 */
function syncFromEngine(): void {
  const node = promiseNode.value
  if (!node) {
    portCount.value = 2
    readyCount.value = 0
    portStates.value = []
    triggering.value = false
    return
  }
  const count = node.displayPortCount
  portCount.value = count
  readyCount.value = node.readyCount
  const snapshot: boolean[] = new Array(count)
  for (let i = 0; i < count; i++) {
    snapshot[i] = node.isPortReady(i)
  }
  portStates.value = snapshot
  triggering.value = node.isTriggering
}

onMounted(() => {
  syncFromEngine()
  offChanged = promiseNode.value?.onChanged(syncFromEngine)
})

onUnmounted(() => {
  offChanged?.()
})

watch(promiseNode, (node, prev) => {
  if (node && node !== prev) {
    syncFromEngine()
    offChanged?.()
    offChanged = node.onChanged(syncFromEngine)
  }
})

const { startDrag } = useNodePosition(() => promiseNode.value)

/** 「-」按钮是否可用 */
const canRemove = computed(() => portCount.value > 2)

/** 全部就绪（但动画还没播） */
const allReady = computed(() =>
  portStates.value.length > 0 && portStates.value.every(s => s)
)

/**
 * triggering 变为 true → 等 DOM 布局稳定 → 从每行的 DOM rect 算贝塞尔路径。
 * rows 用 space-evenly 铺满 .node，Y 坐标天然和外部 NodeShell 的 ports-col 对齐。
 */
watch(triggering, async (val) => {
  if (!val) {
    flowPaths.value = []
    return
  }
  await nextTick()
  computeFlowPaths()
})

/**
 * 生成 N 条水平直线路径：
 *   起点: (START_X, row.midY)
 *   终点: (END_X,   row.midY)
 * 每条路径对应一个端口对，小圆点沿直线并发飞过去。
 */
function computeFlowPaths(): void {
  const nodeEl = (document.querySelector(`[data-node-id="${props.id}"] .node-content`) as HTMLElement | null)
    || (document.querySelector(`.node-shell[data-node-id="${props.id}"]`) as HTMLElement | null)
  if (!nodeEl) return

  const rect = nodeEl.getBoundingClientRect()
  svgWidth.value = Math.round(rect.width)
  svgHeight.value = Math.round(rect.height)

  const START_X = 2
  const END_X = Math.round(rect.width) - 2

  const paths: string[] = []
  for (let i = 0; i < portCount.value && i < rowRefs.value.length; i++) {
    const rowEl = rowRefs.value[i]
    if (!rowEl) continue
    const rowRect = rowEl.getBoundingClientRect()
    const midY = rowRect.top + rowRect.height / 2 - rect.top
    // 水平直线：和行对齐
    paths.push(`M ${START_X} ${midY} L ${END_X} ${midY}`)
  }
  flowPaths.value = paths
}

function onAdd(): void {
  promiseNode.value?.addPortPairAtEnd()
}

function onRemove(): void {
  promiseNode.value?.removePortPairAt(portCount.value - 1)
}

/** 手动触发按钮可用条件：有就绪的、但还没全部就绪、且不在动画中 */
const canForce = computed(() =>
  !triggering.value && readyCount.value > 0 && readyCount.value < portCount.value
)

async function onForceTrigger(): Promise<void> {
  const missing = portCount.value - readyCount.value
  const confirmed = await window.showConfirm(
    '强制触发？',
    t('forceTriggerConfirm', {
      ready: readyCount.value,
      total: portCount.value,
      missing
    })
  )
  if (!confirmed) return
  promiseNode.value?.forceTrigger()
}
</script>

<template>
  <div class="node">
    <!-- SVG 数据流动画 overlay：triggering=true 时出现，圆点从左飞右 -->
    <svg
      v-if="flowPaths.length > 0"
      class="node__flow-svg"
      :width="svgWidth"
      :height="svgHeight"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      preserveAspectRatio="none"
    >
      <!-- 底层 path（淡色描边） -->
      <path
        v-for="(d, i) in flowPaths"
        :key="`p-${i}`"
        :id="`flow-path-${id}-${i}`"
        :d="d"
        fill="none"
        stroke="#16a34a"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.25"
      />
      <!-- 飞行圆点：沿 path 动画 -->
      <circle
        v-for="(_, i) in flowPaths"
        :key="`c-${i}`"
        r="4"
        fill="#16a34a"
        class="flow-dot"
      >
        <animateMotion
          :dur="flowAnimMs + 'ms'"
          fill="freeze"
          begin="0ms"
          :rotate="0"
        >
          <mpath :href="`#flow-path-${id}-${i}`" />
        </animateMotion>
      </circle>
    </svg>

    <!-- rows：占满全部高度 + space-evenly，和两侧 ports-col 对齐 -->
    <div
      class="node__rows"
      :class="{ 'node__rows--all': allReady }"
    >
      <div
        v-for="(_, index) in portCount"
        :key="index"
        class="node__row"
        :ref="(el) => { if (el) rowRefs[index] = el as HTMLDivElement }"
      >
        <!-- 就绪小圆点：实心绿 / 空心灰 -->
        <span
          class="node__dot"
          :class="{ 'node__dot--ready': portStates[index] }"
        />
        <span class="node__row-label">
          {{ portStates[index] ? '✓' : '○' }} {{ index + 1 }}
        </span>
      </div>
    </div>

    <!-- header：顶部浮层 -->
    <NodeHeader
      :title="nodeTitle"
      :title-hint="t('dragHint')"
      :drag-handler="startDrag"
      :help-title="t('helpTitle')"
      @help="showHelp = true"
    />

    <!-- actions：底部浮层，只留 +/− -->
    <div class="node__actions" @pointerdown.stop>
      <button
        class="node__btn"
        type="button"
        :title="canRemove ? t('removePort') : t('removePortDisabled')"
        :disabled="!canRemove"
        @click="onRemove"
      >−</button>
      <button
        class="node__btn"
        type="button"
        :title="t('addPort')"
        @click="onAdd"
      >+</button>
    </div>

    <!-- 中央强制推送按钮：独立层，居中显示，条件满足才出现 -->
    <button
      v-if="canForce"
      class="node__center-btn"
      type="button"
      :title="t('forceTrigger')"
      @pointerdown.stop
      @click="onForceTrigger"
    >▶</button>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <PromiseAllHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 8px;
  padding-top: 0;
  overflow: hidden;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  // —— SVG overlay ——

  &__flow-svg {
    position: absolute;
    inset: 0;
    z-index: 5; // 在 rows 之上、header/actions 之下
    pointer-events: none;
    display: block;
    height: 100%;
    width: calc(100% - 15px);
    left: 15px;

    .flow-dot {
      filter: drop-shadow(0 0 2px rgba(22, 163, 74, 0.6));
    }
  }

  // —— rows ——

  &__rows {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    padding-left: 12px;
    pointer-events: none;
    z-index: 2;

    &--all .node__row-label {
      color: #16a34a;
    }
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    font-size: 11px;
    color: #9ca3af;
    transition: color 0.15s;
    pointer-events: none;
  }

  &__dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1.5px solid #d1d5db;
    background: transparent;
    flex-shrink: 0;
    transition: background 0.15s, border-color 0.15s;

    &--ready {
      border-color: #16a34a;
      background: #16a34a;
    }
  }

  &__row-label {
    font-variant-numeric: tabular-nums;
    transition: color 0.15s;
  }

  // —— header（NodeHeader 浮层覆盖）——
  :deep(.node-header) {
    border-bottom: none; // 原浮层 header 无分割线
  }

  :deep(.node-header__handle) {
    text-align: center;
  }

  // —— actions ——

  &__actions {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: 4px 0;
    pointer-events: auto;
    z-index: 10;
  }

  &__btn {
    all: unset;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 16px;
    font-weight: 600;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover:not(:disabled) {
      background: #dbeafe;
      color: #2563eb;
    }

    &:active:not(:disabled) {
      background: #bfdbfe;
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  // —— 中央强制推送按钮 ——

  &__center-btn {
    all: unset;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #dbeafe;
    color: #2563eb;
    font-size: 16px;
    font-weight: 600;
    line-height: 1;
    pointer-events: auto;
    z-index: 8; // 在 rows/SVG 之上、header(10) 之下
    transition: background 0.15s, color 0.15s, transform 0.1s;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);

    &:hover {
      background: #dcfce7;
      color: #16a34a;
    }

    &:active {
      background: #bbf7d0;
      transform: translate(-50%, -50%) scale(0.9);
    }
  }
}
</style>
