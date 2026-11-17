<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

/**
 * audio 业务类型单元格：懒加载音频文件，显示原生 audio 播放器。
 * 用 blob URL 而非 data URL —— CSP media-src 常禁 data: 但允许 blob:。
 */
const props = defineProps<{
  value: unknown
  nodeId: string
}>()

const blobUrl = ref<string>('')
const loading = ref(false)
const error = ref(false)

async function loadAudio(): Promise<void> {
  const relPath = typeof props.value === 'string' ? props.value : ''
  if (!relPath) {
    if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = ''
    error.value = false
    return
  }

  loading.value = true
  error.value = false
  try {
    // @ts-ignore
    const res: any = await window.tableApi.readFileAsDataUrl({
      // @ts-ignore
      canvasId: window.getCurrentCanvasId(),
      nodeId: props.nodeId,
      relPath
    })
    if (res.ok) {
      if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
      blobUrl.value = URL.createObjectURL(new Blob([res.buffer], { type: res.mime }))
    } else {
      error.value = true
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.value, loadAudio, { immediate: true })

onBeforeUnmount(() => {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})
</script>

<template>
  <div class="audio-cell">
    <template v-if="!value">
      <span class="audio-cell__empty">—</span>
    </template>

    <template v-else-if="loading">
      <span class="audio-cell__loading">…</span>
    </template>

    <template v-else-if="error">
      <span class="audio-cell__error">⚠</span>
    </template>

    <template v-else>
      <audio :src="blobUrl" controls preload="none" class="audio-cell__player" />
    </template>
  </div>
</template>

<style scoped>
.audio-cell {
  display: inline-flex;
  align-items: center;
  min-width: 120px;
}

.audio-cell__player {
  height: 28px;
  width: 180px;
}

.audio-cell__empty {
  color: var(--color-text-muted, #9ca3af);
  font-size: 12px;
}

.audio-cell__loading {
  color: var(--color-text-muted, #9ca3af);
  font-size: 16px;
}

.audio-cell__error {
  color: #dc2626;
  font-size: 14px;
}
</style>
