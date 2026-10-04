<script setup lang="ts">
/**
 * date 业务类型单元格：直接显示 YYYY-MM-DD，天然友好。
 */
const props = defineProps<{ value: unknown }>()

const PLACEHOLDER = '—'
</script>

<template>
  <span class="date-cell">{{ props.value || PLACEHOLDER }}</span>
</template>

<style scoped>
.date-cell {
  font-family: monospace;
  font-size: 11px;
  color: #374151;
}
</style>
