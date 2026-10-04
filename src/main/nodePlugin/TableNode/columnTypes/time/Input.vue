<script setup lang="ts">
/**
 * time 业务类型输入：原生 <input type="datetime-local">。
 *
 * emit 的值是 ISO 格式字符串（'YYYY-MM-DDTHH:mm'），天然兼容 string 存储类型。
 * modelValue 可以是任意值：非字符串 / 非法格式 → fallback 空串 ''。
 * 支持清空（input 为空时 emit ''）。
 */
const props = defineProps<{ modelValue: unknown; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

/** datetime-local 要求 'YYYY-MM-DDTHH:mm' 格式 */
const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

/** 兼容带秒的 ISO 字符串（后端可能返回 '2024-01-15T10:30:00'），裁掉秒 */
function normalize(v: unknown): string {
  if (typeof v !== 'string') return ''
  const trimmed = v.trim()
  // 标准 datetime-local 格式
  if (DT_RE.test(trimmed)) return trimmed
  // 带秒：'2024-01-15T10:30:00' → '2024-01-15T10:30'
  const withSec = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}/)
  if (withSec) return withSec[1]
  // 带时区：'2024-01-15T10:30:00Z' 或 '2024-01-15T10:30+08:00' → 裁到分钟
  const withTz = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?$/)
  if (withTz) return withTz[1]
  return ''
}

function onChange(e: Event): void {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <input
    type="datetime-local"
    class="time-input"
    :value="normalize(props.modelValue)"
    :disabled="props.disabled"
    step="60"
    @change="onChange"
  />
</template>

<style scoped>
.time-input {
  height: 28px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 12px;
  color: #1e293b;
  background: #fff;
  cursor: pointer;
  width: 160px;

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
