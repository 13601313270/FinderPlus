<script setup lang="ts">
/** StringValue 渲染器：字符串直接展示，超长截断 */
defineProps<{
  value: { value?: string; displayLabel: string }
  context?: 'tooltip' | 'detail' | 'inline'
}>()
</script>

<template>
  <span class="v-string">{{ value.displayLabel }}</span>
</template>

<style scoped lang="less">
.v-string {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #16a34a;
  font-size: 10px;
}
</style>
