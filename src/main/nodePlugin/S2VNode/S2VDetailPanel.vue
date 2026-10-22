<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { S2VNode, type S2VResolution } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'

/**
 * 数字人对口型节点的配置面板（detailPanel 中间栏）。
 * 画布 render.vue 只管「连接提示 + 生成/取消按钮 + 视频预览」，
 * Workspace ID / 分辨率 / 合规检测开关都在这里改。
 */
const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)

const node = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof S2VNode ? n : undefined
})

const workspaceId = ref('')
const resolution = ref<S2VResolution>('480P')
const enableDetect = ref(true)
const hasDashscopeKey = ref(true)

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

function sync(n: S2VNode): void {
  workspaceId.value = n.displayWorkspaceId
  resolution.value = n.displayResolution
  enableDetect.value = n.displayEnableDetect
  hasDashscopeKey.value = n.hasDashscopeKey
}

function onWorkspaceIdInput(v: string): void { node.value?.setWorkspaceId(v) }
function onResolutionChange(v: string): void { node.value?.setResolution(v as S2VResolution) }
function onDetectChange(v: boolean): void { node.value?.setEnableDetect(v) }
</script>

<template>
  <div class="detail-panel">
    <!-- 鉴权警告 -->
    <div v-if="!hasDashscopeKey" class="detail-panel__warn">
      {{ t('apiKeyMissing') }}
    </div>

    <!-- Workspace ID（MAAS 端点必填） -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('workspaceIdLabel') }}</label>
      <input
        class="detail-panel__input"
        :value="workspaceId"
        :placeholder="t('workspaceIdPlaceholder')"
        @input="(e: Event) => onWorkspaceIdInput((e.target as HTMLInputElement).value)"
      />
      <div class="detail-panel__hint">{{ t('workspaceIdHint') }}</div>
    </div>

    <!-- 分辨率 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('resolutionLabel') }}</label>
      <select
        class="detail-panel__select"
        :value="resolution"
        @change="(e: Event) => onResolutionChange((e.target as HTMLSelectElement).value)"
      >
        <option v-for="r in node?.availableResolutions ?? []" :key="r" :value="r">{{ r }}</option>
      </select>
    </div>

    <!-- 合规检测开关 -->
    <div class="detail-panel__section">
      <label class="detail-panel__check">
        <input
          type="checkbox"
          :checked="enableDetect"
          @change="(e: Event) => onDetectChange((e.target as HTMLInputElement).checked)"
        />
        <span>{{ t('detectLabel') }}</span>
      </label>
      <div class="detail-panel__hint">{{ t('detectHint') }}</div>
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
  }

  &__check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #1f2937;
    cursor: pointer;
    user-select: none;

    input {
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: #2563eb;
    }
  }

  &__hint {
    font-size: 11px;
    color: #9ca3af;
    line-height: 1.4;
  }

  &__warn {
    font-size: 11px;
    color: #b45309;
    background: #fef3c7;
    padding: 6px 8px;
    border-radius: 4px;
    line-height: 1.4;
  }
}
</style>