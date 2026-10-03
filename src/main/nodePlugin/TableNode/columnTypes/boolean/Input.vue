<script setup lang="ts">
/**
 * boolean 类型表单输入：原生 checkbox
 *
 * 对外接口统一：modelValue + update:modelValue。
 * 内部用 !! 归一化——任何 truthy/falsy 值都转成 boolean，和主进程 insertRow/updateRow 的 Boolean 转 INTEGER 逻辑对齐。
 */
const props = defineProps<{ modelValue: unknown }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

const checked = defineModel<boolean>('modelValue')
</script>

<template>
  <label class="tbl-form__checkbox-label">
    <input
      type="checkbox"
      v-model="checked"
    />
    {{ checked ? 'true' : 'false' }}
  </label>
</template>
