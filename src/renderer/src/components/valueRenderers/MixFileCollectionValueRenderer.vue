<script setup lang="ts">
/**
 * MixFileCollectionValue 渲染器：混合文件集合的紧凑展示。
 *
 * - tooltip/inline 模式：📁 emoji + 数量标签
 * - detail 模式：可滚动文件列表，根据文件类型显示不同图标
 *
 * objectURL 生命周期内聚：watch fingerprint 重建，卸载时 revoke。
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import type { MixFileCollectionValue } from '../../../../main/engine/data/mixFileCollectionValue'

const props = defineProps<{
  value: MixFileCollectionValue
  context?: 'tooltip' | 'detail' | 'inline'
}>()

const emit = defineEmits<{
  resize: []
}>()

/**
 * 根据 MIME type 返回对应的 emoji 图标。
 */
function getFileIcon(file: File): string {
  const type = file.type
  if (type.startsWith('image/')) return '🖼️'
  if (type.startsWith('audio/')) return '🎵'
  if (type.startsWith('video/')) return '🎬'
  if (type.startsWith('text/')) return '📄'
  if (type.includes('pdf')) return '📕'
  if (type.includes('json')) return '📋'
  if (type.includes('html')) return '🌐'
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return '🗜️'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) return '📊'
  if (type.includes('presentation') || type.includes('powerpoint')) return '📽️'
  return '📎'
}

/**
 * 收集有效的文件条目。
 */
interface Entry { name: string; icon: string; file: File }
const entries = ref<Entry[]>([])

function buildEntries(): void {
  entries.value = []

  if (props.value.isNull || !props.value.items) return

  for (const item of props.value.items) {
    if (item.isNull || !item.file) continue
    entries.value.push({ name: item.file.name, icon: getFileIcon(item.file), file: item.file })
  }
}

watch(
  () => props.value.fingerprint,
  buildEntries,
  { immediate: true }
)

onUnmounted(() => {
  // MixFileCollection 不需要 objectURL，只展示文件名
})

/** detail 模式下最多展示的条目数，超出部分折叠成 "+N" */
const MAX_LIST = computed(() => props.context === 'detail' ? 10 : 3)

const visibleItems = computed(() => entries.value.slice(0, MAX_LIST.value))
const hiddenCount = computed(() => Math.max(0, entries.value.length - MAX_LIST.value))

const sizeClass = computed(() => ({
  'v-mix-collection--tooltip': props.context !== 'detail',
  'v-mix-collection--detail': props.context === 'detail'
}))

const isCompact = computed(() => props.context !== 'detail')
</script>

<template>
  <div class="v-mix-collection" :class="sizeClass">
    <!-- 紧凑模式：emoji + 数量 -->
    <template v-if="isCompact">
      <div class="v-mix-collection__icon">📁</div>
      <span class="v-mix-collection__count">{{ value.displayLabel }}</span>
    </template>

    <!-- detail 模式：可滚动文件列表 -->
    <template v-else>
      <div class="v-mix-collection__list">
        <div
          v-for="(entry, i) in visibleItems"
          :key="i"
          class="v-mix-collection__item"
        >
          <span class="v-mix-collection__item-icon">{{ entry.icon }}</span>
          <span class="v-mix-collection__item-name" :title="entry.name">{{ entry.name }}</span>
        </div>
        <div
          v-if="hiddenCount > 0"
          class="v-mix-collection__overflow"
        >+{{ hiddenCount }} more</div>
      </div>
      <span class="v-mix-collection__total">{{ value.displayLabel }}</span>
    </template>
  </div>
</template>

<style scoped lang="less">
.v-mix-collection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;

  &__icon {
    font-size: 28px;
    opacity: 0.5;
  }

  &__count {
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
    text-align: center;
  }

  &__list {
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 4px;
    border-radius: 2px;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }

  &__item-icon {
    font-size: 12px;
    flex-shrink: 0;
  }

  &__item-name {
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: rgba(255, 255, 255, 0.7);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  &__overflow {
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    padding: 2px;
  }

  &__total {
    font-size: 9px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
  }
}
</style>
