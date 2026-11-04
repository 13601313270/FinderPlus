<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { NotifyNode } from './node'

/**
 * 通知节点的详情面板中间栏：
 * - 多行 textarea，配置自定义通知文字
 * - 留空则 fallback 到输入值的 displayLabel
 *
 * 接收 props: { nodeId }，自己到 workspaceScene 拿节点实例。
 */
const props = defineProps<{ nodeId: string }>()

const notifyNode = computed(() => {
  const node = workspaceScene.getNode(props.nodeId)
  return node instanceof NotifyNode ? node : undefined
})

const templateValue = ref('')

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = notifyNode.value
  if (!node) return
  sync(node)
  offChanged = node.onChanged(() => {
    if (notifyNode.value) sync(notifyNode.value)
  })
})

onUnmounted(() => {
  offChanged?.()
})

function sync(node: NotifyNode): void {
  templateValue.value = node.getTextTemplate()
}

/** 文字框敲字 → 立即写回节点 */
function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  notifyNode.value?.setTextTemplate(target.value)
}

// 当 panel 激活时（nodeId 变化）重新 sync
watch(() => props.nodeId, () => {
  const node = notifyNode.value
  if (node) sync(node)
})
</script>

<template>
  <div class="detail-panel">
    <div class="detail-panel__section">
      <label class="detail-panel__label">通知文字</label>
      <textarea
        class="detail-panel__textarea"
        rows="6"
        :value="templateValue"
        :disabled="!notifyNode"
        placeholder="留空则使用输入值的显示名称"
        @input="onInput"
      />
      <div class="detail-panel__hint">
        收到输入值时将使用此处配置的文字作为通知正文。留空则自动取输入值的显示名称。
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.detail-panel {
  box-sizing: border-box;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  &__textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    resize: vertical;
    flex-shrink: 0;
    line-height: 1.6;
    color: #1f2937;

    &:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  &__hint {
    font-size: 11px;
    color: #6b7280;
    line-height: 1.5;
  }
}
</style>
