<script setup lang="ts">
/** BoolValue 渲染器：true / false 直接展示 */
defineProps<{
  value: { value?: boolean; displayLabel: string }
  context?: 'tooltip' | 'detail' | 'inline'
}>()
</script>

<template>
  <span class="v-bool">{{ value.displayLabel }}</span>
</template>

<style scoped lang="less">
.v-bool {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #ea580c;
  font-size: 10px;
}
</style>
