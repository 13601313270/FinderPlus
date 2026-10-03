<script setup lang="ts">
/** color 业务类型单元格：色块 swatch + hex 值 */
const props = defineProps<{ value: unknown }>()

function toHex(v: unknown): string {
  if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) return v
  return '#ffffff'
}
</script>

<template>
  <span class="color-cell">
    <span class="color-cell__swatch" :style="{ background: toHex(props.value) }" />
    <span class="color-cell__hex">{{ props.value ?? '#ffffff' }}</span>
  </span>
</template>

<style scoped>
.color-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.color-cell__swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.color-cell__hex {
  font-family: monospace;
  font-size: 11px;
  color: #64748b;
}
</style>
