<script setup lang="ts">
/** TxtFileValue 渲染器：前 N 字符预览 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  value: { file?: File; displayLabel: string }
  context?: 'tooltip' | 'detail' | 'inline'
}>()

const preview = ref<string>('')

const PREVIEW_TOOLTIP = 80   // tooltip 模式显示 80 字符
const PREVIEW_DETAIL = 500   // detail 模式显示 500 字符
const previewLen = computed(() =>
  props.context === 'detail' ? PREVIEW_DETAIL : PREVIEW_TOOLTIP
)

let readerAbort: AbortController | null = null

async function loadPreview(): Promise<void> {
  const f = props.value.file
  if (!f) { preview.value = '(null)'; return }
  try {
    // 只读部分：切片 + 解码
    const sliced = f.slice(0, previewLen.value * 4) // 保守按 UTF-8 4 字节估算
    const text = await sliced.text()
    preview.value = text.slice(0, previewLen.value)
  } catch {
    preview.value = '(读取失败)'
  }
}

watch(() => props.value.file, loadPreview, { immediate: true })
watch(previewLen, loadPreview)

onUnmounted(() => { readerAbort?.abort() })
</script>

<template>
  <div class="v-txt" :class="{ 'v-txt--detail': context === 'detail' }">
    <div class="v-txt__name">{{ value.displayLabel }}</div>
    <pre v-if="preview" class="v-txt__preview">{{ preview }}</pre>
  </div>
</template>

<style scoped lang="less">
.v-txt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;

  &__name {
    font-size: 10px;
    color: #9ca3af;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__preview {
    margin: 0;
    padding: 4px 6px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 3px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #e5e7eb;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 60px;
    overflow: hidden;
  }

  &--detail &__preview {
    max-height: 200px;
    overflow-y: auto;
    font-size: 12px;
  }
}
</style>
