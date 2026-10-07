<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { StringConcatNode } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'

/**
 * 字符串拼接节点的详情面板中间栏：
 * - 模板大 textarea
 * - 端口数量显示 + 增删按钮
 * - 实时拼接结果预览
 *
 * 接收 props: { nodeId }，自己到 workspaceScene 拿节点实例。
 * 改节点状态的方式跟画布上的 render.vue 完全一样——
 * node.setTemplate() / addInputPort() / removeLastInputPort() → notifyChanged → 画布卡片和 OUTPUT 栏都会同步。
 */
const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)

const concatNode = computed(() => {
  const node = workspaceScene.getNode(props.nodeId)
  return node instanceof StringConcatNode ? node : undefined
})

const templateValue = ref('')
const resultValue = ref('')
const inputCount = ref(0)

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = concatNode.value
  if (!node) return
  sync(node)
  offChanged = node.onChanged(() => {
    if (concatNode.value) sync(concatNode.value)
  })
})

onUnmounted(() => {
  offChanged?.()
})

function sync(node: StringConcatNode): void {
  templateValue.value = node.templateText
  resultValue.value = node.displayResult
  inputCount.value = node.inputCount
}

/** 模板框敲字 → 更新模板并立即重算 */
function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  concatNode.value?.setTemplate(target.value)
}

function onAddPort(): void {
  concatNode.value?.addInputPort()
}

function onRemovePort(): void {
  concatNode.value?.removeLastInputPort()
}

// 当 panel 激活时（nodeId 变化）重新 sync
watch(() => props.nodeId, () => {
  const node = concatNode.value
  if (node) sync(node)
})
</script>

<template>
  <div class="detail-panel">
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('templatePlaceholder') }}</label>
      <textarea
        class="detail-panel__template"
        rows="10"
        :value="templateValue"
        :disabled="!concatNode"
        :placeholder="t('templatePlaceholder')"
        @input="onInput"
      />
    </div>

    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('portsCount', { n: inputCount }) }}</label>
      <div class="detail-panel__ports-actions">
        <button
          class="detail-panel__btn"
          type="button"
          :disabled="!concatNode || inputCount <= 1"
          @click="onRemovePort"
        >
          －
        </button>
        <button
          class="detail-panel__btn detail-panel__btn--primary"
          type="button"
          :disabled="!concatNode"
          @click="onAddPort"
        >
          ＋
        </button>
      </div>
    </div>

    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('fullResultDialogTitle') }}</label>
      <div class="detail-panel__result">{{ resultValue || t('resultPlaceholder') }}</div>
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

  &__template {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    resize: vertical;
    flex-shrink: 0;
    line-height: 1.6;

    &:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  &__ports-actions {
    display: flex;
    gap: 8px;
  }

  &__btn {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 16px;
    line-height: 1;
    color: #374151;
    transition: border-color 0.15s, color 0.15s, background 0.15s;

    &:hover:not(:disabled) {
      border-color: #2563eb;
      color: #2563eb;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    &--primary {
      background: #2563eb;
      color: #fff;
      border-color: #2563eb;

      &:hover:not(:disabled) {
        background: #1d4ed8;
        border-color: #1d4ed8;
        color: #fff;
      }
    }
  }

  &__result {
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #f7f8fa;
    font-size: 13px;
    line-height: 1.6;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    white-space: pre-wrap;
    word-break: break-all;
    min-height: 60px;
    max-height: 200px;
    overflow-y: auto;
    color: #1f2937;
  }
}
</style>
