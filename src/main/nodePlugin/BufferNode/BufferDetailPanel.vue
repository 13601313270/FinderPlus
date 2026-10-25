<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { BufferNode, type BufferKind } from './node'
import type { Value } from '../../engine/data/Value'
import ValueRenderer from '@renderer/components/ValueRenderer.vue'

/**
 * 缓冲区节点（队列 / 栈）的详情面板中间栏：
 * - 顶部：类型、数量、方向提示（队首→队尾 / 栈底→栈顶）
 * - 列表：每一项显示序号、类型徽章、预览（复用全局 ValueRenderer），可展开看详情（detail 模式）
 *
 * 接收 props: { nodeId }，自己到 workspaceScene 拿节点实例。
 * 复用 BufferNode 基类，QueueNode / StackNode 各自的 manifest 都可以指向这个组件。
 */
const props = defineProps<{ nodeId: string }>()

const bufferNode = computed(() => {
  const node = workspaceScene.getNode(props.nodeId)
  return node instanceof BufferNode ? node : undefined
})

const kind = ref<BufferKind>('number')
const count = ref(0)
const items = ref<readonly Value[]>([])
const isQueue = ref(false)

/** 当前展开详情的条目下标（-1 表示都不展开） */
const expandedIndex = ref(-1)

let offChanged: (() => void) | undefined

function sync(node: BufferNode): void {
  kind.value = node.displayKind
  count.value = node.count
  items.value = node.bufferedItems
  // 通过运行时类型判断是 QueueNode 还是 StackNode
  isQueue.value = node.type === 'queue'
  // 如果当前展开的条目因为队列变化越界了，重置
  if (expandedIndex.value >= items.value.length) {
    expandedIndex.value = -1
  }
}

onMounted(() => {
  const node = bufferNode.value
  if (!node) return
  sync(node)
  offChanged = node.onChanged(() => {
    if (bufferNode.value) sync(bufferNode.value)
  })
})

onUnmounted(() => {
  offChanged?.()
})

watch(() => props.nodeId, () => {
  const node = bufferNode.value
  if (node) sync(node)
})

/** 切换展开 / 收起某一项的详情 */
function toggleExpand(index: number): void {
  expandedIndex.value = expandedIndex.value === index ? -1 : index
}

/** 从 Value 实例获取它的 ValueKind（子类的静态 VALUE_NAME），用于类型徽章 */
function getValueKind(item: Value): string {
  return (item.constructor as unknown as { VALUE_NAME: string }).VALUE_NAME
}
</script>

<template>
  <div class="buffer-detail">
    <!-- 顶部：基本信息 -->
    <div v-if="bufferNode" class="buffer-detail__header">
      <div class="buffer-detail__stat">
        <span class="buffer-detail__stat-label">类型</span>
        <span class="buffer-detail__stat-value buffer-detail__kind">{{ kind }}</span>
      </div>
      <div class="buffer-detail__stat">
        <span class="buffer-detail__stat-label">数量</span>
        <span class="buffer-detail__stat-value buffer-detail__count">{{ count }}</span>
      </div>
      <div class="buffer-detail__dir">
        {{ isQueue ? '队首 → 队尾' : '栈底 → 栈顶' }}
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="bufferNode && items.length === 0" class="buffer-detail__empty">
      {{ isQueue ? '队列为空，等待上游送入数据' : '栈为空，等待上游送入数据' }}
    </div>

    <!-- 条目列表 -->
    <div v-else-if="bufferNode" class="buffer-detail__list">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="buffer-detail__item"
      >
        <!-- 行：序号 + 类型徽章 + 预览 + 展开按钮 -->
        <div class="buffer-detail__row" :class="{ 'is-expanded': expandedIndex === index }">
          <span class="buffer-detail__index">{{ index + 1 }}</span>
          <span class="buffer-detail__badge">{{ getValueKind(item) }}</span>
          <span class="buffer-detail__preview">
            <ValueRenderer :value="item" context="inline" />
          </span>
          <button
            class="buffer-detail__expand-btn"
            type="button"
            :aria-label="expandedIndex === index ? '收起详情' : '展开详情'"
            @click="toggleExpand(index)"
          >
            <svg
              class="buffer-detail__chevron"
              :class="{ 'is-open': expandedIndex === index }"
              viewBox="0 0 20 20"
              fill="currentColor"
              width="14"
              height="14"
            >
              <path
                fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <!-- 展开的详情内容（复用全局 ValueRenderer 的 detail 模式） -->
        <div v-if="expandedIndex === index" class="buffer-detail__content">
          <ValueRenderer :value="item" context="detail" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.buffer-detail {
  box-sizing: border-box;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 14px;
    background: #f7f8fa;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    flex-shrink: 0;
  }

  &__stat {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__stat-label {
    font-size: 12px;
    color: #6b7280;
  }

  &__stat-value {
    font-size: 13px;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #1f2937;
  }

  &__kind {
    text-transform: uppercase;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: #e0e7ff;
    color: #3730a3;
  }

  &__count {
    color: #2563eb;
  }

  &__dir {
    margin-left: auto;
    font-size: 11px;
    color: #9ca3af;
    font-style: italic;
  }

  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: #9ca3af;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__item {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
    transition: border-color 0.15s;

    &:hover {
      border-color: #d1d5db;
    }
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #fff;
    cursor: default;

    &.is-expanded {
      background: #fafbfc;
    }
  }

  &__index {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    background: #f3f4f6;
    border-radius: 50%;
  }

  &__badge {
    flex-shrink: 0;
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    padding: 1px 6px;
    border-radius: 4px;
    background: #f3f4f6;
    color: #6b7280;
    text-transform: uppercase;
  }

  &__preview {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #374151;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__expand-btn {
    all: unset;
    flex-shrink: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    color: #9ca3af;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: #2563eb;
      background: #eff6ff;
    }
  }

  &__chevron {
    transition: transform 0.2s;
    transform: rotate(-90deg);

    &.is-open {
      transform: rotate(0deg);
    }
  }

  &__content {
    padding: 10px 12px;
    background: #fafbfc;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #1f2937;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>
