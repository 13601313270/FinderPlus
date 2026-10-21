<script setup lang="ts">
/**
 * AudioFileValue 渲染器：音频预览 + 文件名。
 * - tooltip/inline 模式：🎵 占位 emoji + 文件名
 * - detail 模式：原生 <audio controls> 播放器 + 文件名
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
  'v-audio--tooltip': props.context !== 'detail',
  'v-audio--detail': props.context === 'detail'
}))

const isDetail = computed(() => props.context === 'detail')
</script>

<template>
  <div class="v-audio" :class="sizeClass">
    <div v-if="isDetail" class="v-audio__wrap">
      <audio v-if="url" :src="url" controls preload="metadata"
        class="v-audio__player" @loadedmetadata="emit('resize')" />
      <span v-else class="v-audio__placeholder">🎵</span>
    </div>
    <div v-else class="v-audio__wrap v-audio__wrap--thumb">
      <span class="v-audio__placeholder">🎵</span>
    </div>
    <span class="v-audio__name">{{ value.displayLabel }}</span>
  </div>
</template>

<style scoped lang="less">
.v-audio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;

  &__wrap {
    width: 100%;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;

    &--thumb {
      height: 80px;

      .v-audio--detail & {
        height: 200px;
      }
    }

    .v-audio--detail &:not(&--thumb) {
      padding: 16px 8px;
    }
  }

  &__player {
    width: 100%;
    height: 40px;
  }

  &__placeholder {
    font-size: 32px;
    opacity: 0.4;

    .v-audio--detail & {
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
