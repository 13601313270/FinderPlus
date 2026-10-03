<script setup lang="ts">
/** textarea 业务类型单元格：长文本单行 ellipsis + hover title 看全文 */
const props = defineProps<{ value: unknown }>()
</script>

<template>
  <span class="textarea-cell" :title="String(props.value ?? '')">{{ String(props.value ?? '') }}</span>
</template>

<style scoped>
.textarea-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
