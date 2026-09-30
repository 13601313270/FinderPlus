<script setup lang="ts">
/**
 * 折叠/展开 chevron 图标（lucide 风格）。
 * - 通过 currentColor 继承父级颜色
 * - 其他节点要做折叠/展开按钮直接复用，跟 HelpIcon / GearIcon 同目录同风格
 */
defineProps<{
  /** up = 显示向上箭头（含义：点它会折叠 / 当前已展开）
   *  down = 显示向下箭头（含义：点它会展开 / 当前已折叠） */
  direction: 'up' | 'down'
  /** 尺寸，默认 14 */
  size?: number
}>()
</script>

<template>
  <svg
    :width="size ?? 14"
    :height="size ?? 14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polyline
      v-if="direction === 'up'"
      points="18 15 12 9 6 15"
    />
    <polyline
      v-else
      points="6 9 12 15 18 9"
    />
  </svg>
</template>
