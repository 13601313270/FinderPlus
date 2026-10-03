<script setup lang="ts">
/** boolean 业务类型单元格：✓ / — */
const props = defineProps<{ value: unknown }>()
</script>

<template>
  <span class="bool-cell">{{ props.value ? '✓' : '' }}</span>
</template>

<style scoped>
.bool-cell { font-weight: 600; }
</style>
