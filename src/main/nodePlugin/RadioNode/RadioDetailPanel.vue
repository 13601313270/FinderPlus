<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { RadioNode, type RadioOption, type RadioValueKind, type RadioOptionsSource } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'

/**
 * 单选枚举节点的详情面板中间栏：
 * - 输出类型下拉
 * - 选项列表（label/value 编辑 + 增删）
 * - 输入端口驱动时的覆盖提示
 *
 * 接收 props: { nodeId }，自己到 workspaceScene 拿节点实例。
 * 改节点状态的方式跟画布上的 render.vue 完全一样——
 * node.setKind() / addOption() / removeOption() / setOptionLabel() / setOptionValue()
 * → notifyChanged → 画布卡片和 OUTPUT 栏都会同步。
 */
const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)

const radioNode = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof RadioNode ? n : undefined
})

const options = ref<readonly RadioOption[]>([])
const kind = ref<RadioValueKind>('string')
const source = ref<RadioOptionsSource>('manual')
const cacheInput = ref(false)

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = radioNode.value
  if (!node) return
  sync(node)
  offChanged = node.onChanged(() => {
    if (radioNode.value) sync(radioNode.value)
  })
})

onUnmounted(() => {
  offChanged?.()
})

watch(() => props.nodeId, () => {
  const node = radioNode.value
  if (node) sync(node)
})

function sync(node: RadioNode): void {
  options.value = [...node.displayOptions]
  kind.value = node.displayKind
  source.value = node.displaySource
  cacheInput.value = node.displayCacheInput
}

// —— UI → Node ——

function onKindChange(e: Event): void {
  radioNode.value?.setKind((e.target as HTMLSelectElement).value as RadioValueKind)
}

function onCacheInputChange(v: boolean): void {
  radioNode.value?.setCacheInput(v)
}

function onAddOption(): void {
  radioNode.value?.addOption()
}

function onRemoveOption(id: string): void {
  radioNode.value?.removeOption(id)
}

function onLabelInput(id: string, e: Event): void {
  radioNode.value?.setOptionLabel(id, (e.target as HTMLInputElement).value)
}

function onValueInput(id: string, e: Event): void {
  radioNode.value?.setOptionValue(id, (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="detail-panel">
    <!-- 输出类型 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('outputTypeLabel') }}</label>
      <select class="detail-panel__select" :value="kind" @change="onKindChange">
        <option value="string">string</option>
        <option value="number">number</option>
      </select>
    </div>

    <!-- 输入选项自动缓存开关（永远可交互，不受 source===input 限制） -->
    <label class="detail-panel__toggle">
      <input
        class="detail-panel__toggle-input"
        type="checkbox"
        :checked="cacheInput"
        :disabled="!radioNode"
        @change="(e) => onCacheInputChange((e.target as HTMLInputElement).checked)"
      />
      <span class="detail-panel__toggle-label">{{ t('cacheInputLabel') }}</span>
    </label>
    <div class="detail-panel__hint">{{ t('cacheInputHint') }}</div>

    <!-- JSON 输入覆盖中的提示条 -->
    <div v-if="source === 'input'" class="detail-panel__input-banner">
      <span class="detail-panel__input-banner-icon">⚡</span>
      <span>{{ t('inputOverrideHint') }}</span>
    </div>

    <!-- 选项列表 -->
    <div class="detail-panel__section">
      <div class="detail-panel__section-head">
        <span class="detail-panel__label">{{ t('optionsTitle') }}</span>
        <button
          class="detail-panel__add"
          type="button"
          :title="t('addOptionHint')"
          :disabled="source === 'input'"
          :class="{ 'detail-panel__add--disabled': source === 'input' }"
          @click="onAddOption"
        >＋</button>
      </div>
      <div class="detail-panel__list">
        <div v-for="opt in options" :key="opt.id" class="detail-panel__row">
          <input
            class="detail-panel__input"
            type="text"
            :value="opt.label"
            :placeholder="t('labelPlaceholder')"
            :disabled="source === 'input'"
            @input="(e) => onLabelInput(opt.id, e)"
          />
          <input
            class="detail-panel__input"
            :type="kind === 'number' ? 'number' : 'text'"
            step="any"
            :value="opt.value"
            :placeholder="t('valuePlaceholder')"
            :disabled="source === 'input'"
            @input="(e) => onValueInput(opt.id, e)"
          />
          <button
            class="detail-panel__remove"
            type="button"
            :title="t('removeOptionHint')"
            :disabled="options.length <= 1 || source === 'input'"
            @click="onRemoveOption(opt.id)"
          >×</button>
        </div>
      </div>
    </div>

    <div class="detail-panel__hint">{{ t('valueHint') }}</div>
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
    width: 100%;
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

  &__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 260px;
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
    }

    &--disabled {
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

  &__toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }

  &__toggle-input {
    width: 16px;
    height: 16px;
    accent-color: #2563eb;
    cursor: pointer;

    &:disabled {
      cursor: not-allowed;
    }
  }

  &__toggle-label {
    font-size: 12px;
    color: #374151;
  }

  &__input-banner {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    font-size: 11px;
    line-height: 1.5;
    color: #b45309;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: 6px;
  }

  &__input-banner-icon {
    flex-shrink: 0;
  }
}
</style>
