<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { MergeNode, type MergeKind } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import NodeHeader from '@renderer/components/NodeHeader.vue'

/**
 * 汇流节点渲染组件：
 * - 顶部：NodeHeader（标题）
 * - 中间：类型下拉 + 端口数显示
 * - 底部：+/- 按钮（node__actions）
 *
 * 输入端口动态增删，节点高度随端口数自动变化。
 */
const props = defineProps<{ id: string }>()

const mergeNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof MergeNode ? node : undefined
})

const nodeTitle = useNodeTitle(() => mergeNode.value, '?')
const t = useLocalizedMessages(messages)

const KIND_OPTIONS: readonly MergeKind[] = ['number', 'string', 'bool', 'file', 'imgfile', 'json']

const kind = ref<MergeKind>('number')
const portCount = ref(1)

let unsubscribe: (() => void) | undefined

function syncFromEngine(): void {
  const node = mergeNode.value
  if (!node) {
    kind.value = 'number'
    portCount.value = 1
    return
  }
  kind.value = node.displayKind
  portCount.value = node.displayPortCount
}

onMounted(() => {
  syncFromEngine()
  unsubscribe = mergeNode.value?.onChanged(syncFromEngine)
})

onUnmounted(() => {
  unsubscribe?.()
})

watch(mergeNode, (node, prev) => {
  if (node && node !== prev) {
    syncFromEngine()
    unsubscribe?.()
    unsubscribe = node.onChanged(syncFromEngine)
  }
})

/** 「-」按钮是否可用（至少保留 MIN_PORT_COUNT 个） */
const canRemove = computed(() => portCount.value > 1)

function onKindChange(e: Event): void {
  mergeNode.value?.setKind((e.target as HTMLSelectElement).value as MergeKind)
}

function onAdd(): void {
  mergeNode.value?.addInputPortAtEnd()
}

function onRemove(): void {
  mergeNode.value?.removeInputPortAt(portCount.value - 1)
}
</script>

<template>
  <div class="merge">
    <NodeHeader :title="nodeTitle" />

    <div class="merge__body">
      <div class="merge__row">
        <span class="merge__label">{{ t('typeLabel') }}</span>
        <select class="merge__select" :value="kind" :disabled="!mergeNode" @pointerdown.stop @change="onKindChange">
          <option v-for="k in KIND_OPTIONS" :key="k" :value="k">{{ k }}</option>
        </select>
      </div>

      <div class="merge__count">
        <div>
          {{ portCount }} {{ t('portsLabel') }}
        </div>
        <!-- actions：底部浮层，+/- 按钮 -->
        <div class="merge__actions" @pointerdown.stop>
          <button class="merge__btn" type="button" :disabled="!canRemove" @click="onRemove">−</button>
          <button class="merge__btn" type="button" @click="onAdd">+</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.merge {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 8px;
  padding-top: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  // —— 中间内容区 ——

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding: 4px 0;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  &__label {
    font-size: 11px;
    color: @color-text-weak;
    user-select: none;
    flex-shrink: 0;
  }

  &__select {
    box-sizing: border-box;
    flex: 1;
    min-width: 0;
    padding: 3px 6px;
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #1f2937;
    border: 1px solid @node-border-color;
    border-radius: 5px;
    background: @color-surface;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: @color-primary;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__count {
    font-size: 10px;
    color: #9ca3af;
    text-align: center;
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
  }

  // —— actions ——

  &__actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    pointer-events: auto;
    flex-shrink: 0;
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
}
</style>
