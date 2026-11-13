<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

/**
 * image 业务类型单元格：懒加载缩略图。
 * value 是 SQLite 里存的 relPath（如 'a1b2c3.png'）。
 * mount 时调 tableApi.readFileAsDataUrl 拿到 ArrayBuffer + mime → 生成 blob URL 渲染。
 * 用 blob URL 而不是 data URL：CSP 的 media-src 常禁 data: 但允许 blob:，且无 base64 体积膨胀。
 */
const props = defineProps<{
  value: unknown
  nodeId: string
}>()

const blobUrl = ref<string>('')
const loading = ref(false)
const error = ref(false)

async function loadImage(): Promise<void> {
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
    const res = await window.tableApi.readFileAsDataUrl({
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

watch(() => props.value, loadImage, { immediate: true })

onBeforeUnmount(() => {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})
</script>

<template>
  <div class="img-cell">
    <template v-if="!value">
      <span class="img-cell__empty">—</span>
    </template>

    <template v-else-if="loading">
      <span class="img-cell__loading">…</span>
    </template>

    <template v-else-if="error">
      <span class="img-cell__error">⚠</span>
    </template>

    <template v-else>
      <img
        :src="blobUrl"
        class="img-cell__thumb"
        alt=""
        @click="$emit('preview', blobUrl)"
      />
    </template>
  </div>
</template>

<style scoped>
.img-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 28px;
}

.img-cell__thumb {
  max-width: 48px;
  max-height: 36px;
  object-fit: cover;
  border-radius: 3px;
  cursor: zoom-in;
  border: 1px solid var(--color-border, #d1d5db);
  background: var(--color-bg-secondary, #f9fafb);
}

.img-cell__empty {
  color: var(--color-text-muted, #9ca3af);
  font-size: 12px;
}

.img-cell__loading {
  color: var(--color-text-muted, #9ca3af);
  font-size: 16px;
}

.img-cell__error {
  color: #dc2626;
  font-size: 14px;
}
</style>
