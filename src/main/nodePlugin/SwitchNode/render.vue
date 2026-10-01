<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { SwitchNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'

/**
 * Switch 条件分支节点的渲染组件（只画卡片内容）。
 *
 * 视觉极简：不画汇合点、不分叉。当前条件是什么，就只画一根直线
 * 从 data 输入端口（Y≈73）直连命中的输出端口（pass Y≈37 / fail Y≈73）。
 * - true → 绿色斜线到 pass
 * - false → 红色水平线到 fail
 * - pending → 灰色占位线
 */
const props = defineProps<{ id: string }>()

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

const switchNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof SwitchNode ? node : undefined
})

/** 当前条件：true = 走 pass，false = 走 fail，undefined = 条件端口还没值 */
const condition = ref<boolean | undefined>(undefined)

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = switchNode.value
  if (!node) return
  condition.value = node.displayCondition
  offChanged = node.onChanged(() => {
    condition.value = switchNode.value?.displayCondition
  })
})

onUnmounted(() => {
  offChanged?.()
})

// 节点整体拖拽（落点写回 node.position）；位置本身由外壳跟随 node.position 展示。
const { startDrag } = useNodePosition(() => switchNode.value)

// —— 唯一生效直线：data 输入 → 命中的输出 ——
// NodeShell space-evenly 等分 110px 高度：
//   2 port-item × min-height 28px = 56px 固定
//   剩余 54px 均成 3 槽 = 每槽 18px
//   port-item 1 top=18, 圆心 Y=18+14=32
//   port-item 2 top=64, 圆心 Y=64+14=78
// 蓝圆点圆心在 content 侧线上：输入 x=0，输出 x=160
const wirePath = computed(() => {
  if (condition.value === true) {
    // data(0,81) → pass(160,28)：三次贝塞尔曲线（cubic bezier）
    // 两个控制点对称：C1 拉成水平切线，C2 拉成水平切线
    return 'M0 81 C60 81, 40 28, 100 28'
  }
  if (condition.value === false) {
    // data → fail：水平线
    return 'M0 81 L160 81'
  }
  // pending：不画
  return ''
})

const wireColor = computed(() => {
  if (condition.value === undefined) return '#cbd5e1'
  return condition.value ? '#16a34a' : '#dc2626'
})

const wireDash = computed(() => condition.value === undefined ? '4 4' : '')
</script>

<template>
  <div class="node" @pointerdown="startDrag" :title="t('dragHint')">
    <!-- 顶部小标签 -->
    <div class="node__label">switch</div>

    <!-- 唯一生效直线：data → 命中的输出 -->
    <svg class="node__svg" viewBox="0 0 160 110" preserveAspectRatio="none">
      <path v-if="wirePath" :d="wirePath" fill="none" :stroke="wireColor" stroke-width="2.5" stroke-linecap="round"
        :stroke-dasharray="wireDash" opacity="0.85" />
    </svg>

    <!-- 分支标签：当前生效的高亮 -->
    <div class="node__branch-label node__branch-label--pass"
      :class="{ 'node__branch-label--active': condition === true }">
      {{ t('branchPass') }}
    </div>
    <div class="node__branch-label node__branch-label--fail"
      :class="{ 'node__branch-label--active': condition === false }">
      {{ t('branchFail') }}
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  position: relative;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  &__label {
    position: absolute;
    top: 3px;
    left: 6px;
    font-size: 10px;
    color: @color-text-weak;
    z-index: 10;
  }

  &__svg {
    width: 100%;
    height: 100%;
    display: block;
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  &__branch-label {
    position: absolute;
    font-size: 9px;
    padding: 0 4px;
    border-radius: 3px;
    line-height: 14px;
    white-space: nowrap;
    font-weight: 500;
    opacity: 0.45;
    transition: opacity 0.15s, background 0.15s;
    z-index: 10;

    &--pass {
      top: 11px;
      right: 5px;
      color: #16a34a;
    }

    &--fail {
      top: 43px;
      right: 5px;
      color: #dc2626;
    }

    &--active {
      opacity: 1;

      &.node__branch-label--pass {
        background: rgba(22, 163, 74, 1);
        color: white;
      }

      &.node__branch-label--fail {
        color: white;
        background: rgba(220, 38, 38, 1);
      }
    }
  }
}
</style>
