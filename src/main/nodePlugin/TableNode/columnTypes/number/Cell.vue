<script setup lang="ts">
/** number 业务类型单元格：展示数字，非有限值回退 0 */
const props = defineProps<{ value: unknown }>()

function fmt(v: unknown): string | number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
</script>

<template>
  <span>{{ fmt(value) }}</span>
</template>
