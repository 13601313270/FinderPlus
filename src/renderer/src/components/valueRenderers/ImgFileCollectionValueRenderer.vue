<script setup lang="ts">
/**
 * ImgFileCollectionValue 渲染器：多张图片缩略图网格 + "+N" 徽章。
 *
 * - tooltip 模式：紧凑网格（最多 4 张 + "+N"），端口气泡里空间有限
 * - detail 模式：稍大网格（最多 8 张 + "+N"），NodeDetailDialog 三栏里空间充裕
 *
 * objectURL 生命周期同 ImgFileValueRenderer——组件内部统一管理，
 * 不再散落在外部的 revoke 逻辑里。
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import type { ImgFileCollectionValue } from '../../../../main/engine/data/ImgFileCollectionValue'

const props = defineProps<{
  value: ImgFileCollectionValue
  context?: 'tooltip' | 'detail' | 'inline'
}>()

const emit = defineEmits<{
  resize: []
}>()

/**
 * 已生成的 objectURL 列表（与 items 一一对应，过滤掉了 null/无 file 的项）。
 * 用 ref 存数组，方便 watch 重建时先 revoke 旧的。
 */
interface Entry { url: string; file: File }
const entries = ref<Entry[]>([])

function buildEntries(): void {
  // 先清理旧的
  for (const e of entries.value) URL.revokeObjectURL(e.url)
  entries.value = []

  if (props.value.isNull || !props.value.items) return

  for (const item of props.value.items) {
    if (item.isNull || !item.file) continue
    if (!item.file.type.startsWith('image/')) continue
    entries.value.push({ url: URL.createObjectURL(item.file), file: item.file })
  }
}

watch(
  () => props.value.fingerprint, // fingerprint 变了 = items 整体换了
  buildEntries,
  { immediate: true }
)

onUnmounted(() => {
  for (const e of entries.value) URL.revokeObjectURL(e.url)
})

/** 网格里最多展示的缩略图数量，超出部分折叠成 "+N" 徽章 */
const MAX_THUMBS = computed(() => props.context === 'detail' ? 8 : 4)

const visibleThumbs = computed(() => entries.value.slice(0, MAX_THUMBS.value))
const hiddenCount = computed(() => Math.max(0, entries.value.length - MAX_THUMBS.value))

const sizeClass = computed(() => ({
  'v-collection--tooltip': props.context !== 'detail',
  'v-collection--detail': props.context === 'detail'
}))
</script>

<template>
  <div class="v-collection" :class="sizeClass">
    <!-- 缩略图网格 -->
    <div class="v-collection__grid">
      <div
        v-for="(entry, i) in visibleThumbs"
        :key="i"
        class="v-collection__thumb"
      >
        <img
          :src="entry.url"
          :alt="entry.file.name"
          @load="emit('resize')"
        />
      </div>
      <!-- "+N" 徽章：有更多未展示的缩略图时 -->
      <div
        v-if="hiddenCount > 0"
        class="v-collection__overflow"
      >+{{ hiddenCount }}</div>
    </div>

    <!-- 底部计数标签 -->
    <span class="v-collection__count">{{ value.displayLabel }}</span>
  </div>
</template>

<style scoped lang="less">
.v-collection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;

  &__grid {
    display: grid;
    gap: 2px;
    width: 100%;

    /* tooltip 模式：2 列 */
    .v-collection--tooltip & {
      grid-template-columns: repeat(2, 1fr);
    }

    /* detail 模式：4 列 */
    .v-collection--detail & {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  &__thumb {
    position: relative;
    aspect-ratio: 1 / 1;
    border-radius: 3px;
    overflow: hidden;
    background: #111827;
    border: 1px solid rgba(255, 255, 255, 0.1);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__overflow {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1 / 1;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.7);
    font-size: 11px;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__count {
    font-size: 9px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: rgba(255, 255, 255, 0.6);
    white-space: nowrap;
    max-width: 100%;
    text-align: center;
  }
}
</style>
