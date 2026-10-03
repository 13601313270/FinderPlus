<script setup lang="ts">
/**
 * number 类型表单输入：原生 <input type="number">
 *
 * 对外接口统一：modelValue + update:modelValue。
 * 内部做一次 normalize：空串 / 非数字 → 0，和 submitDialog 里的 Number.isFinite 逻辑对齐。
 */
const props = defineProps<{ modelValue: unknown; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

function toNumber(raw: unknown): number {
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', toNumber(target.value))
}
</script>

<template>
  <input
    type="number"
    class="tbl-form__input"
    :value="toNumber(props.modelValue)"
    :disabled="props.disabled"
    @input="onInput"
  />
</template>
