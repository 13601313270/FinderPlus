<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ManualTriggerNode, ALL_BUTTON_VALUE_TYPES } from './node'
import type { ButtonConfig, ButtonValueType } from './node'

/**
 * 手动触发节点的详情面板中间栏：
 * - 按钮列表（label + valueType 编辑 + 增删）
 * - 每个按钮对应一个 OutputPort，改类型会自动重建端口并断下游边
 */
const props = defineProps<{ nodeId: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof ManualTriggerNode ? n : undefined
})

const buttons = ref<readonly ButtonConfig[]>([])

let offChanged: (() => void) | undefined

onMounted(() => {
  const n = node.value
  if (!n) return
  sync(n)
  offChanged = n.onChanged(() => {
    if (node.value) sync(node.value)
  })
})

onUnmounted(() => {
  offChanged?.()
})

watch(() => props.nodeId, () => {
  const n = node.value
  if (n) sync(n)
})

function sync(n: ManualTriggerNode): void {
  buttons.value = n.buttonConfigs
}

// —— UI → Node ——

function onAddButton(): void {
  node.value?.addButton()
}

function onRemoveButton(id: string): void {
  node.value?.removeButton(id)
}

function onLabelInput(id: string, e: Event): void {
  node.value?.setButtonLabel(id, (e.target as HTMLInputElement).value)
}

function onTypeChange(id: string, e: Event): void {
  node.value?.setButtonType(id, (e.target as HTMLSelectElement).value as ButtonValueType)
}
</script>

<template>
  <div class="detail-panel">
    <div class="detail-panel__section">
      <div class="detail-panel__section-head">
        <span class="detail-panel__label">按钮列表</span>
        <button
          class="detail-panel__add"
          type="button"
          title="添加按钮"
          :disabled="!node"
          @click="onAddButton"
        >＋</button>
      </div>
      <div class="detail-panel__list">
        <div v-for="btn in buttons" :key="btn.id" class="detail-panel__row">
          <input
            class="detail-panel__input detail-panel__input--flex"
            type="text"
            :value="btn.label"
            placeholder="按钮名称"
            :disabled="!node"
            @input="(e) => onLabelInput(btn.id, e)"
          />
          <select
            class="detail-panel__select"
            :value="btn.valueType"
            :disabled="!node"
            @change="(e) => onTypeChange(btn.id, e)"
          >
            <option v-for="t in ALL_BUTTON_VALUE_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
          <button
            class="detail-panel__remove"
            type="button"
            title="删除按钮"
            :disabled="buttons.length <= 1 || !node"
            @click="onRemoveButton(btn.id)"
          >×</button>
        </div>
      </div>
    </div>

    <div class="detail-panel__hint">
      每个按钮对应一个独立的输出端口，类型可不同。点击按钮时会把输入端口的值推送到对应下游。
      类型变更会断开该端口已有的下游连线。
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
  gap: 14px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  &__select,
  &__input {
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    background: #fff;
    color: #1f2937;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &__input {
    flex: 1;

    &--flex {
      flex: 1;
    }
  }

  &__select {
    flex-shrink: 0;
    min-width: 96px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 340px;
    overflow-y: auto;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__add {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    background: #f3f4f6;
    color: #374151;
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    transition: background 0.15s;

    &:hover:not(:disabled) {
      background: #e5e7eb;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }
  }

  &__remove {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    color: #9aa2ad;
    font-size: 15px;
    line-height: 1;
    flex-shrink: 0;
    transition: color 0.15s, background 0.15s;

    &:hover:not(:disabled) {
      color: #dc2626;
      background: #fee2e2;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  }

  &__hint {
    font-size: 11px;
    line-height: 1.5;
    color: #9aa2ad;
  }
}
</style>
