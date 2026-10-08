<script setup lang="ts">
/**
 * ImgFileValue 渲染器：缩略图 + 文件名。
 * - tooltip 模式：80px 高缩略图（NodePort 用）
 * - detail 模式：200px 高大图
 *
 * objectURL 生命周期内聚在本组件内部——挂载 create，卸载 revoke，
 * 不再散落在 NodePort.vue 的 imageUrls / collectImageFiles / revokeAllUrls 里。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  value: { file?: File; displayLabel: string }
  context?: 'tooltip' | 'detail' | 'inline'
}>()

const url = ref<string>('')
const loaded = ref(false)
const emit = defineEmits<{
  resize: []
}>()

function createUrl(): void {
  if (url.value) { URL.revokeObjectURL(url.value); url.value = '' }
  loaded.value = false
  const f = props.value.file
  if (f && f.type.startsWith('image/')) {
    url.value = URL.createObjectURL(f)
  }
}

watch(() => props.value.file, createUrl, { immediate: true })
onUnmounted(() => { if (url.value) URL.revokeObjectURL(url.value) })

const sizeClass = computed(() => ({
  'v-img--tooltip': props.context !== 'detail',
  'v-img--detail': props.context === 'detail'
}))
</script>

<template>
  <div class="v-img" :class="sizeClass">
    <img
      v-if="url"
      :src="url"
      :alt="value.displayLabel"
      class="v-img__thumb"
      @load="loaded = true; emit('resize')"
    />
    <span v-else class="v-img__placeholder">(null)</span>
    <span class="v-img__name">{{ value.displayLabel }}</span>
  </div>
</template>

<style scoped lang="less">
.v-img {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;

  &__thumb {
    width: 100%;
    height: 80px;
    object-fit: cover;
    border-radius: 4px;
    background: #111827;
    border: 1px solid rgba(255, 255, 255, 0.12);
    display: block;

    .v-img--detail & {
      height: 200px;
    }
  }

  &__placeholder {
    font-size: 10px;
    color: #9ca3af;
    font-style: italic;
  }

  &__name {
    font-size: 9px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: rgba(255, 255, 255, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    text-align: center;
  }
}
</style>
