<script setup lang="ts">
/**
 * FileValue 渲染器：文件元信息展示。
 * ImgFileValueRenderer / TxtFileValueRenderer / PdfFileValueRenderer 各自有特化展示。
 */
import { computed } from 'vue'

const props = defineProps<{
  value: { file?: File; displayLabel: string; constructor: { VALUE_NAME: string } }
  context?: 'tooltip' | 'detail' | 'inline'
}>()

const meta = computed(() => {
  const f = props.value.file
  if (!f) return null
  return {
    name: f.name,
    size: `${(f.size / 1024).toFixed(1)} KB`,
    type: f.type || '(unknown)'
  }
})
</script>

<template>
  <!-- tooltip / inline：文件名单行 -->
  <span v-if="context !== 'detail'" class="v-file">{{ value.displayLabel }}</span>
  <!-- detail：完整元信息 -->
  <div v-else-if="meta" class="v-file-detail">
    <div class="v-file-detail__name">{{ meta.name }}</div>
    <div class="v-file-detail__meta">
      <span>{{ meta.size }}</span>
      <span class="v-file-detail__type">{{ meta.type }}</span>
    </div>
  </div>
  <span v-else class="v-null">(null)</span>
</template>

<style scoped lang="less">
.v-file {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #e5e7eb;
  font-size: 10px;
}

.v-file-detail {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 8px;

  &__name {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 4px;
    word-break: break-all;
  }

  &__meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: #6b7280;
  }

  &__type {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9px;
    padding: 1px 4px;
    background: #e5e7eb;
    border-radius: 2px;
  }
}

.v-null {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #9ca3af;
  font-style: italic;
  font-size: 10px;
}
</style>
