<script setup lang="ts">
/**
 * time 业务类型单元格：把存的 ISO 字符串（'YYYY-MM-DDTHH:mm'）渲染成友好的 'YYYY-MM-DD HH:mm'。
 * 非法值 / 空值 → 显示占位符。
 */
const props = defineProps<{ value: unknown }>()

function format(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) return ''
  const s = v.trim()
  // 'YYYY-MM-DDTHH:mm' → 'YYYY-MM-DD HH:mm'
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (m) {
    const [, y, mo, d, h, mi, se] = m
    if (se) return `${y}-${mo}-${d} ${h}:${mi}:${se}`
    return `${y}-${mo}-${d} ${h}:${mi}`
  }
  // 兜底：直接返回原值（可能是其他格式的时间字符串）
  return s
}

const PLACEHOLDER = '—'
</script>

<template>
  <span class="time-cell" :title="format(props.value)">{{ format(props.value) || PLACEHOLDER }}</span>
</template>

<style scoped>
.time-cell {
  font-family: monospace;
  font-size: 11px;
  color: #374151;
}
</style>
