<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { debounce } from 'lodash-es'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { DelayNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import NodeHeader from '@renderer/components/NodeHeader.vue'

const props = defineProps<{ id: string }>()

const delayNode = shallowRef<DelayNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title
const nodeTitle = useNodeTitle(() => delayNode.value, '?')


/** 输出端口类型标签（UI 显示） */
const typeName = ref('')

/** 当前延时毫秒数（输入框显示） */
const delayMs = ref(0)

/** 是否正在等待（显示 pending 样式） */
const pending = ref(false)

let unsubscribe: (() => void) | undefined

function sync(node: DelayNode): void {
  typeName.value = node.displayTypeName
  delayMs.value = node.displayDelayMs
  pending.value = node.isPending
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof DelayNode) {
    delayNode.value = found
    sync(found)
    unsubscribe = found.onChanged(() => sync(found))
  }
})

onUnmounted(() => {
  unsubscribe?.()
  debouncedSetDelayMs.cancel()
})

/** 300ms 防抖：连续敲击数字框不要每次都重新计时 */
const debouncedSetDelayMs = debounce((ms: number) => {
  delayNode.value?.setDelayMs(ms)
}, 300)

function onDelayInput(e: Event): void {
  const el = e.target as HTMLInputElement
  if (el.value.trim() === '') return
  const value = el.valueAsNumber
  if (!Number.isFinite(value)) return
  debouncedSetDelayMs(value)
}
</script>

<template>
  <div class="node" :class="{ 'node--pending': pending }">
    <NodeHeader :title="nodeTitle" justify="center" />
    <div class="delay-body">
      <input
        class="delay-body__input"
        type="number"
        inputmode="numeric"
        min="0"
        step="100"
        :value="delayMs"
        :disabled="!delayNode"
        @input="onDelayInput"
        @pointerdown.stop
      />
      <span class="delay-body__unit">ms</span>
      <span v-if="typeName" class="delay-body__type">{{ typeName }}</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  padding: 8px;
  padding-top: 0;
  flex-direction: column;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;

  &--pending {
    border-color: #818cf8;
    box-shadow: 0 2px 8px rgba(129, 140, 248, 0.25);
  }
}

.delay-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 6px;
  position: relative;
  flex-grow: 1;

  &--pending::after {
    content: '';
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #818cf8;
    animation: delay-pulse 1s ease-in-out infinite;
  }

  &__input {
    width: 48px;
    border: none;
    outline: none;
    background: transparent;
    text-align: right;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    color: @color-text;
    padding: 0;

    &:disabled {
      opacity: 0.5;
    }
  }

  &__unit {
    font-size: 10px;
    color: @color-text-weak;
    flex-shrink: 0;
  }

  &__type {
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: @color-primary;
    background: #eef2ff;
    border-radius: 3px;
    padding: 1px 4px;
    line-height: 1;
    flex-shrink: 0;
  }
}

.node--pending .delay-body::after {
  content: '';
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #818cf8;
  animation: delay-pulse 1s ease-in-out infinite;
}

@keyframes delay-pulse {
  0%, 100% { opacity: 1; transform: translateY(-50%) scale(1); }
  50% { opacity: 0.4; transform: translateY(-50%) scale(1.3); }
}
</style>
