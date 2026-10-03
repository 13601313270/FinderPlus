<script setup lang="ts">
/** text 业务类型单元格：直接展示字符串值 */
defineProps<{ value: unknown }>()
</script>

<template>
  <span>{{ String(value ?? '') }}</span>
</template>
