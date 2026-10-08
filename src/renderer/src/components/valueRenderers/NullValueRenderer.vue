<script setup lang="ts">
/**
 * null 值兜底：所有 Value.isNull=true 的情况都走这个组件。
 * 显示 (null) 占位文案，不区分 kind。
 */
defineProps<{
  value: { isNull: true }
  context?: 'tooltip' | 'detail' | 'inline'
}>()
</script>

<template>
  <span class="v-null">(null)</span>
</template>

<style scoped lang="less">
.v-null {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #9ca3af;
  font-style: italic;
  font-size: 10px;
}
</style>
