<script setup lang="ts">
/**
 * 帮助图标：问号圆圈。
 * - 通过 currentColor 继承父级颜色
 * - 默认 14×14，与 GearIcon 尺寸一致
 */
defineProps<{
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
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
</template>
