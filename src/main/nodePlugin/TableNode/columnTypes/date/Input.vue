<script setup lang="ts">
/**
 * date 业务类型输入：原生 <input type="date">。
 * emit 的值是 'YYYY-MM-DD' 字符串，兼容 string 存储类型。
 */
const props = defineProps<{ modelValue: unknown; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function normalize(v: unknown): string {
  if (typeof v !== 'string') return ''
  return DATE_RE.test(v.trim()) ? v.trim() : ''
}

function onChange(e: Event): void {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <input
    type="date"
    class="date-input"
    :value="normalize(props.modelValue)"
    :disabled="props.disabled"
    @change="onChange"
  />
</template>

<style scoped>
.date-input {
  height: 28px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 12px;
  color: #1e293b;
  background: #fff;
  cursor: pointer;
  width: 140px;

  &:focus {
    border-color: #3b82f6;
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}
</style>
