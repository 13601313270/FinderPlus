<script setup lang="ts">
/**
 * 未知 kind 兜底：三方插件未调用 registerValueRenderer() 时用它。
 * 显示 displayLabel + kind 标签，保证不会白屏。
 * 也是显式清单架构的"安全网"——让未注册的 kind 至少能展示文本。
 */
import { computed } from 'vue'

const props = defineProps<{
  value: { displayLabel: string; constructor: { VALUE_NAME: string } }
  context?: 'tooltip' | 'detail' | 'inline'
}>()

const kind = computed(() => (props.value.constructor as { VALUE_NAME: string }).VALUE_NAME)
</script>

<template>
  <span class="v-unknown" :title="kind">
    <span class="v-unknown__label">{{ value.displayLabel }}</span>
    <span class="v-unknown__kind">{{ kind }}</span>
  </span>
</template>

<style scoped lang="less">
.v-unknown {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &__label {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #e5e7eb;
  }

  &__kind {
    font-size: 8px;
    padding: 0 3px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.7);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    line-height: 1.4;
  }
}
</style>
