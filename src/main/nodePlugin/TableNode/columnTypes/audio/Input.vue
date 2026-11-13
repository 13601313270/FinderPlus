<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * audio 业务类型表单输入：点击选音频 → emit 原生 File 对象。
 * 存盘统一由 TableNode.insertRowValues 处理。
 *
 * modelValue 可能是：string（已有 relPath）| File（新选待存）| ''（清空）。
 */
const props = defineProps<{ modelValue: unknown; disabled?: boolean; nodeId: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

const playerSrc = ref<string>('')
let _isObjectUrl = false

async function loadExistingRelPath(relPath: string): Promise<void> {
  try {
    // @ts-ignore
    const res = await window.tableApi.readFileAsDataUrl({
      // @ts-ignore
      canvasId: window.getCurrentCanvasId(),
      nodeId: props.nodeId,
      relPath
    })
    if (res.ok) {
      if (playerSrc.value && _isObjectUrl) URL.revokeObjectURL(playerSrc.value)
      playerSrc.value = URL.createObjectURL(new Blob([res.buffer], { type: res.mime }))
      _isObjectUrl = true
    }
  } catch (err) {
    console.warn('[AudioInput] 加载已有音频失败：', relPath, err)
  }
}

watch(() => props.modelValue, async (val) => {
  if (playerSrc.value && _isObjectUrl) {
    URL.revokeObjectURL(playerSrc.value)
  }
  playerSrc.value = ''
  _isObjectUrl = false

  if (val instanceof File) {
    playerSrc.value = URL.createObjectURL(val)
    _isObjectUrl = true
  } else if (typeof val === 'string' && val) {
    await loadExistingRelPath(val)
  }
}, { immediate: true })

function onFilePicked(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (playerSrc.value && _isObjectUrl) {
    URL.revokeObjectURL(playerSrc.value)
  }

  playerSrc.value = URL.createObjectURL(file)
  _isObjectUrl = true
  emit('update:modelValue', file)
  input.value = ''
}

function clearAudio(): void {
  if (playerSrc.value && _isObjectUrl) {
    URL.revokeObjectURL(playerSrc.value)
  }
  playerSrc.value = ''
  _isObjectUrl = false
  emit('update:modelValue', '')
}

function dispose(): void {
  if (playerSrc.value && _isObjectUrl) {
    URL.revokeObjectURL(playerSrc.value)
  }
}
defineExpose({ dispose })
</script>

<template>
  <div class="audio-input">
    <!-- 选音频按钮 -->
    <label v-if="!disabled" class="audio-input__btn">
      <span v-if="!playerSrc">🎵 选择音频</span>
      <span v-else>🔄 更换</span>
      <input
        type="file"
        accept="audio/*"
        class="audio-input__file"
        @change="onFilePicked"
      />
    </label>

    <!-- 播放器预览 -->
    <template v-if="playerSrc">
      <audio :src="playerSrc" controls preload="none" class="audio-input__player" />
      <button type="button" class="audio-input__clear" @click="clearAudio">✕</button>
    </template>
  </div>
</template>

<style scoped>
.audio-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.audio-input__btn {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  border: 1px dashed var(--color-border, #d1d5db);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
  background: var(--color-bg-secondary, #f9fafb);
  transition: all 0.15s;
}
.audio-input__btn:hover {
  border-color: var(--color-primary, #3b82f6);
  color: var(--color-primary, #3b82f6);
}
.audio-input__file {
  display: none;
}

.audio-input__player {
  height: 28px;
  width: 180px;
}

.audio-input__clear {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-secondary, #f3f4f6);
  cursor: pointer;
  color: var(--color-text-muted, #6b7280);
}
.audio-input__clear:hover {
  background: #fee2e2;
  color: #dc2626;
}
</style>
