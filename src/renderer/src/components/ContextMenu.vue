<script setup lang="ts">
import { computed, ref } from 'vue'

/** 菜单项：id 用于区分点击哪个，label 是显示文案，action 是点击回调（同步或异步均可） */
export interface MenuItem {
  id: string
  label: string
  action: () => void | Promise<void>
  danger?: boolean
}

const props = defineProps<{
  /** 菜单位置（屏幕坐标系，clientX/clientY） */
  x: number
  y: number
  items: readonly MenuItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

/** 菜单根元素，暴露给父组件做 contains 判断 */
const menuEl = ref<HTMLElement | null>(null)

defineExpose({ menuEl })

/** 样式：fixed 定位，不受世界层平移/缩放影响 */
const menuStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`
}))

/** 点击某个菜单项：执行 action → 通知父组件关闭 */
async function onItemClick(item: MenuItem): Promise<void> {
  try {
    await item.action()
  } finally {
    emit('close')
  }
}
</script>

<template>
  <ul
    ref="menuEl"
    class="context-menu"
    :style="menuStyle"
    @click.stop
    @contextmenu.prevent.stop
  >
    <li
      v-for="item in items"
      :key="item.id"
      class="context-menu__item"
      :class="{ 'context-menu__item--danger': item.danger }"
      @click="onItemClick(item)"
    >
      {{ item.label }}
    </li>
  </ul>
</template>

<style scoped lang="less">
.context-menu {
  position: fixed;
  z-index: 1000;
  margin: 0;
  padding: 4px 0;
  min-width: 120px;
  list-style: none;
  background: @color-surface;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  font-family: @font-sans;
  font-size: 13px;
  user-select: none;

  &__item {
    padding: 6px 16px;
    color: @color-text;
    cursor: pointer;
    transition: background 0.1s;

    &:hover {
      background: #f0f2f5;
    }

    &--danger {
      color: @color-danger;

      &:hover {
        background: #fde8e8;
      }
    }
  }
}
</style>
