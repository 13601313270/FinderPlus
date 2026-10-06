<script setup lang="ts">
import { computed, ref } from 'vue'
import { connectionDrag } from '@renderer/canvas/connectionDrag'
import { bezierPath } from '@renderer/canvas/edges'

/**
 * 连线拖拽的预览线：从按下的 OutputPort 圆点，牵到指针（或吸附到候选 InputPort 圆点）。
 *
 * 它画在**屏幕层**（画布容器里、世界层之外），所以：
 * - 坐标直接用拖拽记录的 client 坐标减掉自己的位置，不必折算世界坐标，也不吃世界层的 scale；
 * - 线宽恒定，且排在世界层之后，压在所有节点之上，拖拽时看得清；
 * - overflow: hidden + pointer-events: none：不出画布，也不挡任何指针事件。
 *
 * 虚线 = 「还没连上」；变红 = 引擎判定这个落点接不上（类型不匹配 / 端口已占用 / 自环）。
 */
const rootEl = ref<HTMLElement | null>(null)

const line = computed(() => {
  if (!connectionDrag.active) return null

  const rect = rootEl.value?.getBoundingClientRect()
  if (!rect) return null

  const from = { x: connectionDrag.fromClient.x - rect.left, y: connectionDrag.fromClient.y - rect.top }
  const to = { x: connectionDrag.toClient.x - rect.left, y: connectionDrag.toClient.y - rect.top }

  return {
    d: bezierPath(from, to, { fromSide: 'out', toSide: connectionDrag.targetSide })
  }
})

const invalid = computed(() => connectionDrag.targetKey !== null && !connectionDrag.targetOk)
</script>

<template>
  <div ref="rootEl" class="connect-preview" aria-hidden="true">
    <svg v-if="line" class="connect-preview__svg">
      <path
        class="connect-preview__line"
        :class="{ 'connect-preview__line--invalid': invalid }"
        :d="line.d"
      />
    </svg>
  </div>
</template>

<style scoped lang="less">
.connect-preview {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;

  &__svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  &__line {
    fill: none;
    stroke: @color-primary;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-dasharray: 7 5;

    &--invalid {
      stroke: @color-danger;
    }
  }
}
</style>
