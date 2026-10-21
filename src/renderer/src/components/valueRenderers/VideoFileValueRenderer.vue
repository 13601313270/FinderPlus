<script setup lang="ts">
/**
 * VideoFileValue 渲染器：视频预览 + 文件名。
 * - tooltip/inline 模式：🎬 占位 emoji + 文件名
 * - detail 模式：原生 <video controls> 预览 + 文件名
 *
 * objectURL 生命周期内聚：watch file 变化 create，卸载 revoke。
 */
import { computed, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  value: { file?: File; displayLabel: string }
  context?: 'tooltip' | 'detail' | 'inline'
}>()

const url = ref<string>('')
const emit = defineEmits<{
  resize: []
}>()

function createUrl(): void {
  if (url.value) { URL.revokeObjectURL(url.value); url.value = '' }
  const f = props.value.file
  if (f) {
    url.value = URL.createObjectURL(f)
  }
}

watch(() => props.value.file, createUrl, { immediate: true })
onUnmounted(() => { if (url.value) URL.revokeObjectURL(url.value) })

const sizeClass = computed(() => ({
  'v-video--tooltip': props.context !== 'detail',
  'v-video--detail': props.context === 'detail'
}))

const isDetail = computed(() => props.context === 'detail')
</script>

<template>
  <div class="v-video" :class="sizeClass">
    <div class="v-video__wrap">
      <video v-if="isDetail && url" :src="url" controls preload="metadata"
        class="v-video__player" @loadedmetadata="emit('resize')" />
      <span v-else class="v-video__placeholder">🎬</span>
    </div>
    <span class="v-video__name">{{ value.displayLabel }}</span>
  </div>
</template>

<style scoped lang="less">
.v-video {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;

  &__wrap {
    width: 100%;
    height: 80px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    .v-video--detail & {
      height: 200px;
    }
  }

  &__player {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  &__placeholder {
    font-size: 32px;
    opacity: 0.4;

    .v-video--detail & {
      font-size: 56px;
    }
  }

  &__name {
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: rgba(255, 255, 255, 0.7);
    word-break: break-all;
    text-align: center;
  }
}
</style>
