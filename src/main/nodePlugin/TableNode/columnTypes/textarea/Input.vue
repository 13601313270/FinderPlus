<script setup lang="ts">
/**
 * textarea 业务类型表单输入：原生 <textarea> 多行输入框。
 *
 * 对外接口统一：modelValue + update:modelValue，让外层能用 v-model 调用。
 * 存储类型是 string，和 text 一样；区别仅在 UI 是多行。
 */
const props = defineProps<{ modelValue: unknown; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <textarea
    class="tbl-form__input tbl-form__textarea"
    :value="String(props.modelValue ?? '')"
    :disabled="props.disabled"
    rows="4"
    @input="onInput"
  />
</template>

<style scoped>
.tbl-form__textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
  font-family: inherit;
}
</style>
