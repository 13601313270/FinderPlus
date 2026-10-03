<script setup lang="ts">
/**
 * color 业务类型输入：原生 <input type="color"> + hex 文本框并排。
 *
 * emit 的值始终是 '#rrggbb' 字符串，天然兼容 string 存储类型。
 * modelValue 可以是任意值：非字符串 / 非法 hex → fallback '#ffffff'。
 */
const props = defineProps<{ modelValue: unknown }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

const HEX_RE = /^#[0-9a-fA-F]{6}$/

function toHex(v: unknown): string {
  if (typeof v === 'string' && HEX_RE.test(v)) return v
  return '#ffffff'
}

function onColorInput(e: Event): void {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function onTextInput(e: Event): void {
  const target = e.target as HTMLInputElement
  const v = target.value.trim()
  emit('update:modelValue', toHex(v))
}
</script>

<template>
  <div class="color-input">
    <input
      type="color"
      class="color-input__picker"
      :value="toHex(props.modelValue)"
      @input="onColorInput"
    />
    <input
      type="text"
      class="color-input__text"
      :value="toHex(props.modelValue)"
      maxlength="7"
      @input="onTextInput"
    />
  </div>
</template>

<style scoped>
.color-input {
  display: flex;
  align-items: center;
  gap: 6px;

  &__picker {
    width: 32px;
    height: 28px;
    padding: 0;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    overflow: hidden;

    &::-webkit-color-swatch-wrapper { padding: 0; }
    &::-webkit-color-swatch { border: none; border-radius: 3px; }
  }

  &__text {
    flex: 1;
    min-width: 0;
    height: 28px;
    padding: 0 8px;
    font-family: monospace;
    font-size: 12px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    color: #1e293b;
    text-transform: lowercase;
  }
}
</style>
