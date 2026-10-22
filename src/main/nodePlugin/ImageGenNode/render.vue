<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImageGenNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import ImageGenHelpDialog from './ImageGenHelpDialog.vue'

/**
 * 文生图节点卡片（画布上的最小视图）：
 * - NodeHeader：标题 + 帮助 + 齿轮（打开全功能 detailPanel）
 * - 状态行：等待提示词 / 正在生成 / 已完成 / 错误
 * - 生成按钮（快捷入口，等同 detailPanel 里的生成按钮）
 * - 一个 tiny 缩略图：刚生成过时显示结果，没生成过则不占位
 *
 * 全功能交互（Provider/模型/尺寸选择、完整预览、重绘弹窗）都在 detailPanel 里。
 */
const props = defineProps<{ id: string }>()

const nodeTitle = useNodeTitle(ImageGenNode.TYPE)
const t = useLocalizedMessages(messages)
const { openNodeDetail } = useNodeDetail()

const node = shallowRef<ImageGenNode | undefined>(undefined)

const showHelp = ref(false)
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const promptConnected = ref(false)

// —— tiny 缩略图 objectURL ——
const imageUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null
let lastFile: File | null = null

let unsubscribe: (() => void) | undefined

function clearImage(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  imageUrl.value = null
}

function syncFromNode(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  promptConnected.value = n.displayPromptConnected

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

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof ImageGenNode) {
    node.value = found
    syncFromNode()
    unsubscribe = found.onChanged(() => syncFromNode())
  }
})

onBeforeUnmount(() => {
  unsubscribe?.()
  clearImage()
})

function onGearClick(): void {
  openNodeDetail(props.id)
}

function onGenClick(): void {
  node.value?.manualTrigger()
}

async function onStopClick(): Promise<void> {
  const confirmed = await window.showConfirm(t('stopConfirmTitle'), t('stopConfirmBody'))
  if (!confirmed) return
  node.value?.cancel()
}
</script>

<template>
  <div class="igen-card">
    <NodeHeader :title="nodeTitle" @help="showHelp = true">
      <template #actions>
        <button
          v-if="node"
          class="igen-card__gear"
          type="button"
          title="打开详情面板"
          @pointerdown.stop
          @click.stop="onGearClick"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- tiny 缩略图：有结果才占地方，否则让状态行填满 -->
    <div v-if="imageUrl" class="igen-card__thumb">
      <img :src="imageUrl" :alt="t('resultAlt')" draggable="false" />
    </div>

    <!-- 状态提示 -->
    <div
      class="igen-card__status"
      :class="{
        'igen-card__status--loading': status === 'loading',
        'igen-card__status--error': status === 'error',
        'igen-card__status--done': status === 'done' && !imageUrl
      }"
    >
      <template v-if="status === 'loading'">
        <span class="igen-card__spinner" />
        <span>{{ t('generating') }}</span>
      </template>
      <template v-else-if="status === 'error'">
        {{ errorMessage }}
      </template>
      <template v-else-if="status === 'idle'">
        <template v-if="!node?.hasProviderKey">
          {{ t('needApiKey') }}
        </template>
        <template v-else-if="!promptConnected">
          {{ t('needPrompt') }}
        </template>
        <template v-else>
          {{ t('ready') }}
        </template>
      </template>
      <template v-else>
        ✅
      </template>
    </div>

    <!-- 快捷按钮 -->
    <div class="igen-card__actions" v-if="node">
      <button
        v-if="status === 'loading'"
        class="igen-card__btn igen-card__btn--stop"
        type="button"
        @click="onStopClick"
      >
        {{ t('stop') }}
      </button>
      <button
        v-else
        class="igen-card__btn"
        type="button"
        :disabled="!promptConnected || !node.hasProviderKey"
        @click="onGenClick"
      >
        {{ t('generate') }}
      </button>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <ImageGenHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.igen-card {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 8px 8px;
  padding-top: 0;

  &__gear {
    all: unset;
    cursor: pointer;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: #6b7280;
    transition: color 0.15s, background 0.15s;

    svg { width: 11px; height: 11px; }

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }

  // —— tiny 缩略图区（可无）——
  &__thumb {
    flex: 1;
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f5f7;
    border: 1px solid @node-border-color;
    border-radius: 6px;
    padding: 4px;
    overflow: hidden;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 3px;
    }
  }

  // —— 状态提示（有缩略图时隐藏，直接靠图片传达状态）——
  &__status {
    font-size: 11px;
    color: #6b7280;
    padding: 4px 6px;
    background: #f9fafb;
    border-radius: 4px;
    line-height: 1.4;
    min-height: 22px;
    display: flex;
    align-items: center;
    gap: 6px;
    text-align: center;

    &--loading {
      color: #3b82f6;
      background: #eff6ff;
    }

    &--error {
      color: #dc2626;
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    &--done {
      color: #16a34a;
      background: #f0fdf4;
      justify-content: center;
    }
  }

  &__spinner {
    width: 11px;
    height: 11px;
    border: 2px solid #bfdbfe;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: igenCardSpin 0.7s linear infinite;
    flex-shrink: 0;
  }

  // —— 底部按钮 ——
  &__actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  &__btn {
    all: unset;
    cursor: pointer;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    font-size: 12px;
    font-weight: 500;
    color: #fff;
    background: #3b82f6;
    border-radius: 5px;
    white-space: nowrap;
    transition: background 0.15s;

    &:hover:not(:disabled) {
      background: #2563eb;
    }

    &:disabled {
      cursor: not-allowed;
      background: #93c5fd;
    }

    &--stop {
      background: #ef4444;
      &:hover { background: #dc2626; }
    }
  }
}

@keyframes igenCardSpin {
  to { transform: rotate(360deg); }
}
</style>
