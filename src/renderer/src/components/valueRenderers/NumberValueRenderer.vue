<script setup lang="ts">
/** NumberValue 渲染器：数字展示，context='detail' 时大字号 + 全精度 */
import { computed } from 'vue'

const props = defineProps<{
  value: { value?: number; displayLabel: string }
  context?: 'tooltip' | 'detail' | 'inline'
}>()

const formatted = computed(() => {
  if (props.value.value === undefined) return '(null)'
  const n = props.value.value
  if (props.context === 'detail') {
    // detail 模式：整数直接显示，小数保留完整精度
    return Number.isInteger(n) ? String(n) : String(n)
  }
  // tooltip / inline：简单展示
  return String(n)
})
</script>

<template>
  <span class="v-number" :class="{ 'v-number--detail': context === 'detail' }">
    {{ formatted }}
  </span>
</template>

<style scoped lang="less">
.v-number {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #2563eb;
  font-size: 10px;

  &--detail {
    font-size: 16px;
    font-weight: 600;
    color: #1d4ed8;
  }
}
</style>
