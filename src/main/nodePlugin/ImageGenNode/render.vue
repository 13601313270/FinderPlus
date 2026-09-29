<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImageGenNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useImageSettings } from '@renderer/composables/useImageSettings'
import GearIcon from '@renderer/components/icons/GearIcon.vue'

/**
 * 文生图节点的渲染组件：
 * - 预览区：生成中显示 spinner，生成完直接内联缩略图，失败显示错误文案
 * - 底部操作栏：尺寸下拉（上游接了尺寸线时置灰，以端口值为准）+ 生成按钮
 *
 * 提示词由上游端口提供，所以节点里没有 prompt 输入框。
 */
const props = defineProps<{ id: string }>()

const { config, hasKey, openSettings } = useImageSettings()

const node = shallowRef<ImageGenNode | undefined>(undefined)
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const promptConnected = ref(false)
const sizeConnected = ref(false)
const sizeOptions = ref<readonly string[]>([])
const size = ref('')
const modelLabel = ref('')

const { startDrag } = useNodePosition(() => node.value)

let unsubscribe: (() => void) | undefined

// —— 缩略图 objectURL；只在 File 变化时重建，避免拖节点时反复建/销 ——
const imageUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null
let lastFile: File | null = null

function clearImage(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  imageUrl.value = null
}

/** 把节点上的派生状态同步到本地 ref（Vue 追踪不到引擎里的普通字段） */
function syncFromNode(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  promptConnected.value = n.displayPromptConnected
  sizeConnected.value = n.displaySizeConnected
  sizeOptions.value = n.displaySizeOptions
  size.value = n.displaySize
  modelLabel.value = n.displayModelLabel

  const file = n.displayFile ?? null
  if (file !== lastFile) {
    lastFile = file
    clearImage()
    if (file) {
      const url = URL.createObjectURL(file)
      imageUrl.value = url
      revokeUrl = () => URL.revokeObjectURL(url)
    }
  }
}

/** 下拉候选：模型支持的尺寸，外加当前生效值（上游可能传入预设外的尺寸） */
const sizeChoices = computed<readonly string[]>(() => {
  const list = [...sizeOptions.value]
  if (size.value && !list.includes(size.value)) list.unshift(size.value)
  return list
})

const placeholder = computed(() => {
  if (!node.value) return '节点不存在'
  if (!hasKey()) return '请先点右上角齿轮配置图像 API Key'
  if (!promptConnected.value) return '请连接上游提示词'
  return '点击「生成」开始文生图'
})

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof ImageGenNode) {
    node.value = found
    syncFromNode()
    unsubscribe = found.onChanged(() => syncFromNode())
  }
})

// 设置里换了 Provider / 模型 → 尺寸选项和默认值都会变，重新同步一次
watch(config, () => syncFromNode(), { deep: true })

onUnmounted(() => {
  unsubscribe?.()
  clearImage()
})

function onGearClick(e: MouseEvent): void {
  e.stopPropagation()
  openSettings()
}

function onSizeChange(e: Event): void {
  node.value?.setSize((e.target as HTMLSelectElement).value)
}

function onGenClick(): void {
  node.value?.manualTrigger()
}
</script>

<template>
  <div class="node">
    <div class="node__header" @pointerdown="startDrag">
      <span class="node__handle" title="拖动节点（整个头部可拖）">文生图</span>
      <button
        v-if="node"
        class="node__gear"
        type="button"
        :title="hasKey() ? '图像模型已配置，点击修改 Key' : '点击配置图像 API Key'"
        @pointerdown.stop
        @click.stop="onGearClick"
      >
        <GearIcon />
      </button>
    </div>

    <!-- 预览区 -->
    <div
      class="igen-preview"
      :class="{
        'igen-preview--empty': !imageUrl && status !== 'loading',
        'igen-preview--error': status === 'error',
        'igen-preview--loading': status === 'loading'
      }"
    >
      <template v-if="status === 'loading'">
        <span class="igen-preview__spinner" />
        <span class="igen-preview__loading-text">生成中…</span>
      </template>
      <img
        v-else-if="imageUrl"
        class="igen-preview__img"
        :src="imageUrl"
        alt="生成结果"
        draggable="false"
      />
      <template v-else-if="status === 'error'">
        {{ errorMessage }}
      </template>
      <template v-else>
        {{ placeholder }}
      </template>
    </div>

    <!-- 底部操作栏：左尺寸下拉 + 右生成按钮 -->
    <div class="node__bottom" v-if="node">
      <select
        class="igen-size"
        :value="size"
        :disabled="sizeConnected"
        :title="sizeConnected ? '尺寸来自上游连线（当前 ' + size + '）' : '当前模型：' + modelLabel"
        @change="onSizeChange"
      >
        <option v-for="s in sizeChoices" :key="s" :value="s">{{ s }}</option>
      </select>
      <button
        class="node__send"
        type="button"
        :disabled="status === 'loading'"
        @click="onGenClick"
      >
        {{ status === 'loading' ? '生成中…' : '生成' }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px dashed #d5d9e0;
    padding-bottom: 4px;
    cursor: grab;
    user-select: none;

    &:active {
      cursor: grabbing;
    }
  }

  &__handle {
    font-size: 12px;
    color: @color-text-weak;
    padding: 2px 0;
  }

  &__gear {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    color: #6b7280;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: #111827;
      background: #f3f4f6;
    }

    &:active {
      background: #e5e7eb;
    }
  }

  &__bottom {
    display: flex;
    align-items: stretch;
    gap: 6px;
    flex-shrink: 0;
  }

  &__send {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 18px;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    background: #3b82f6;
    border-radius: 6px;
    white-space: nowrap;
    transition: background 0.15s;
    height: 32px;

    &:hover:not(:disabled) {
      background: #2563eb;
    }

    &:active:not(:disabled) {
      background: #1d4ed8;
    }

    &:disabled {
      cursor: not-allowed;
      background: #93c5fd;
    }
  }
}

.igen-size {
  flex: 1;
  box-sizing: border-box;
  height: 32px;
  padding: 0 6px;
  font-size: 12px;
  font-family: inherit;
  color: #1f2937;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  outline: none;
  background: #fff;
  cursor: pointer;

  &:focus {
    border-color: #3b82f6;
  }

  &:disabled {
    cursor: not-allowed;
    color: #9aa2ad;
    background: #f3f4f6;
  }
}

.igen-preview {
  padding: 6px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 12px;
  flex: 1;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  overflow: hidden;
  background: #f4f5f7;
  color: #1f2937;

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
    background: #fff;
  }

  &--empty {
    color: #9aa2ad;
    font-style: italic;
  }

  &--error {
    color: #dc2626;
    border-color: #fecaca;
    background: #fef2f2;
  }

  &--loading {
    color: #3b82f6;
  }

  &__spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #bfdbfe;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  &__loading-text {
    font-size: 12px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
