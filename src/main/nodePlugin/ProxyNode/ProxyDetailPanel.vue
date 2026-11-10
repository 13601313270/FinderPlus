<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ProxyNode, type Kind } from './node'

const props = defineProps<{ nodeId: string }>()

const proxyNode = computed(() => {
  const node = workspaceScene.getNode(props.nodeId)
  return node instanceof ProxyNode ? node : undefined
})

const KIND_OPTIONS: readonly Kind[] = ['number', 'string', 'bool', 'file', 'imgfile', 'json']

const inputKinds = ref<Kind[]>(['number'])
const outputKinds = ref<Kind[]>(['number'])

let offChanged: (() => void) | undefined

function syncFromEngine(): void {
  const node = proxyNode.value
  if (!node) {
    inputKinds.value = ['number']
    outputKinds.value = ['number']
    return
  }
  inputKinds.value = [...node.displayInputKinds]
  outputKinds.value = [...node.displayOutputKinds]
}

onMounted(() => {
  syncFromEngine()
  offChanged = proxyNode.value?.onChanged(syncFromEngine)
})

onUnmounted(() => {
  offChanged?.()
})

watch(proxyNode, (node, prev) => {
  if (node && node !== prev) {
    syncFromEngine()
    offChanged?.()
    offChanged = node.onChanged(syncFromEngine)
  }
})

const canRemoveInput = computed(() => inputKinds.value.length > 1)
const canRemoveOutput = computed(() => outputKinds.value.length > 1)

function onInputKindChange(index: number, e: Event): void {
  proxyNode.value?.setInputPortKind(index, (e.target as HTMLSelectElement).value as Kind)
}

function onOutputKindChange(index: number, e: Event): void {
  proxyNode.value?.setOutputPortKind(index, (e.target as HTMLSelectElement).value as Kind)
}

function onAddInput(): void {
  proxyNode.value?.addInputPortAtEnd()
}

function onRemoveInput(): void {
  proxyNode.value?.removeInputPortAtEnd()
}

function onAddOutput(): void {
  proxyNode.value?.addOutputPortAtEnd()
}

function onRemoveOutput(): void {
  proxyNode.value?.removeOutputPortAtEnd()
}
</script>

<template>
  <div class="proxy-detail">
    <!-- 输入端口区 -->
    <section class="proxy-detail__section">
      <header class="proxy-detail__header">
        <span class="proxy-detail__title">输入端口 ({{ inputKinds.length }})</span>
        <div class="proxy-detail__actions">
          <button class="proxy-detail__btn" type="button" :disabled="!canRemoveInput" @click="onRemoveInput">−</button>
          <button class="proxy-detail__btn" type="button" @click="onAddInput">+</button>
        </div>
      </header>
      <div class="proxy-detail__rows">
        <div v-for="(k, i) in inputKinds" :key="'in-' + i" class="proxy-detail__row">
          <span class="proxy-detail__row-label">入 {{ i + 1 }}</span>
          <select class="proxy-detail__select" :value="k" :disabled="!proxyNode" @change="onInputKindChange(i, $event)">
            <option v-for="ko in KIND_OPTIONS" :key="ko" :value="ko">{{ ko }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 输出端口区 -->
    <section class="proxy-detail__section">
      <header class="proxy-detail__header">
        <span class="proxy-detail__title">输出端口 ({{ outputKinds.length }})</span>
        <div class="proxy-detail__actions">
          <button class="proxy-detail__btn" type="button" :disabled="!canRemoveOutput" @click="onRemoveOutput">−</button>
          <button class="proxy-detail__btn" type="button" @click="onAddOutput">+</button>
        </div>
      </header>
      <div class="proxy-detail__rows">
        <div v-for="(k, i) in outputKinds" :key="'out-' + i" class="proxy-detail__row">
          <span class="proxy-detail__row-label">出 {{ i + 1 }}</span>
          <select class="proxy-detail__select" :value="k" :disabled="!proxyNode" @change="onOutputKindChange(i, $event)">
            <option v-for="ko in KIND_OPTIONS" :key="ko" :value="ko">{{ ko }}</option>
          </select>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="less">
.proxy-detail {
  box-sizing: border-box;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
    color: #1f2937;
  }

  &__actions {
    display: flex;
    gap: 6px;
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

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    background: #fafbfc;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }

  &__row-label {
    flex-shrink: 0;
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
    min-width: 48px;
  }

  &__select {
    box-sizing: border-box;
    flex: 1;
    min-width: 0;
    padding: 5px 8px;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #1f2937;
    border: 1px solid #d1d5db;
    border-radius: 5px;
    background: #fff;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
