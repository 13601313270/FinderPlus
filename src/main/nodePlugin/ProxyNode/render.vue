<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ProxyNode, type Kind } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import NodeHeader from '@renderer/components/NodeHeader.vue'

const props = defineProps<{ id: string }>()

const proxyNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof ProxyNode ? node : undefined
})

const nodeTitle = useNodeTitle(() => proxyNode.value, '?')
const t = useLocalizedMessages(messages)

const KIND_OPTIONS: readonly Kind[] = ['number', 'string', 'bool', 'file', 'imgfile', 'json']

const inputKinds = ref<Kind[]>(['number'])
const outputKinds = ref<Kind[]>(['number'])

let unsubscribe: (() => void) | undefined

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
  unsubscribe = proxyNode.value?.onChanged(syncFromEngine)
})

onUnmounted(() => {
  unsubscribe?.()
})

watch(proxyNode, (node, prev) => {
  if (node && node !== prev) {
    syncFromEngine()
    unsubscribe?.()
    unsubscribe = node.onChanged(syncFromEngine)
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
  <div class="proxy">
    <NodeHeader :title="nodeTitle" />

    <div class="proxy__body">
      <!-- 输入端口区域 -->
      <div class="proxy__section">
        <div class="proxy__port-kinds">
          <div v-for="(k, i) in inputKinds" :key="'in-' + i" class="proxy__port-kind">
            <span class="proxy__port-kind-label">{{ t('inLabel') }}{{ i + 1 }}</span>
            <select class="proxy__port-kind-select" :value="k" :disabled="!proxyNode" @pointerdown.stop
              @change="onInputKindChange(i, $event)">
              <option v-for="ko in KIND_OPTIONS" :key="ko" :value="ko">{{ ko }}</option>
            </select>
          </div>
        </div>
        <div class="proxy__section-head">
          <div class="proxy__actions" @pointerdown.stop>
            <button class="proxy__btn" type="button" :disabled="!canRemoveInput" @click="onRemoveInput">−</button>
            <button class="proxy__btn" type="button" @click="onAddInput">+</button>
          </div>
        </div>
      </div>

      <!-- 输出端口区域 -->
      <div class="proxy__section">
        <div class="proxy__section-head">
          <div class="proxy__actions" @pointerdown.stop>
            <button class="proxy__btn" type="button" :disabled="!canRemoveOutput" @click="onRemoveOutput">−</button>
            <button class="proxy__btn" type="button" @click="onAddOutput">+</button>
          </div>
        </div>
        <div class="proxy__port-kinds">
          <div v-for="(k, i) in outputKinds" :key="'out-' + i" class="proxy__port-kind">
            <span class="proxy__port-kind-label">{{ t('outLabel') }}{{ i + 1 }}</span>
            <select class="proxy__port-kind-select" :value="k" :disabled="!proxyNode" @pointerdown.stop
              @change="onOutputKindChange(i, $event)">
              <option v-for="ko in KIND_OPTIONS" :key="ko" :value="ko">{{ ko }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.proxy {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 8px;
  padding-top: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 70px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  &__section {
    display: flex;
    flex-direction: row;
    gap: 3px;
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: @color-text-weak;
    user-select: none;
  }

  &__port-kinds {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__port-kind {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
  }

  &__port-kind-label {
    color: #9ca3af;
    flex-shrink: 0;
  }

  &__port-kind-select {
    box-sizing: border-box;
    padding: 2px 4px;
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #1f2937;
    border: 1px solid @node-border-color;
    border-radius: 4px;
    background: @color-surface;
    outline: none;
    cursor: pointer;
    max-width: 72px;

    &:focus {
      border-color: @color-primary;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  // —— actions ——

  &__actions {
    display: flex;
    gap: 6px;
    flex-direction: column;
    pointer-events: auto;
    flex-shrink: 0;
  }

  &__btn {
    all: unset;
    cursor: pointer;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 14px;
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
