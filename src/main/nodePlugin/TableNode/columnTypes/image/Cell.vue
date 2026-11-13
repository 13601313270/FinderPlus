<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * image 业务类型单元格：懒加载缩略图。
 * value 是 SQLite 里存的 relPath（如 'a1b2c3.png'）。
 * mount 时调 tableApi.readFileAsDataUrl 拿到 base64 data URL 渲染。
 */
const props = defineProps<{
  value: unknown
  nodeId: string
}>()

const dataUrl = ref<string>('')
const loading = ref(false)
const error = ref(false)

async function loadImage(): Promise<void> {
  const relPath = typeof props.value === 'string' ? props.value : ''
  if (!relPath) {
    dataUrl.value = ''
    error.value = false
    return
  }

  loading.value = true
  error.value = false
  try {
    // @ts-ignore — preload API
    const res = await window.tableApi.readFileAsDataUrl({
      // @ts-ignore
      canvasId: window.getCurrentCanvasId(),
      nodeId: props.nodeId,
      relPath
    })
    if (res.ok) {
      dataUrl.value = res.dataUrl
    } else {
      error.value = true
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

// value 变化时重新加载（编辑行后触发）
watch(() => props.value, loadImage, { immediate: true })
</script>

<template>
  <div class="img-cell">
    <!-- 空值：显示占位虚线框 -->
    <template v-if="!value">
      <span class="img-cell__empty">—</span>
    </template>

    <!-- 加载中 -->
    <template v-else-if="loading">
      <span class="img-cell__loading">…</span>
    </template>

    <!-- 加载失败 -->
    <template v-else-if="error">
      <span class="img-cell__error">⚠</span>
    </template>

    <!-- 缩略图：可点击查看大图 -->
    <template v-else>
      <img
        :src="dataUrl"
        class="img-cell__thumb"
        alt=""
        @click="$emit('preview', dataUrl)"
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
