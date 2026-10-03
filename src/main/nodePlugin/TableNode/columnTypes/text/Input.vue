<script setup lang="ts">
/**
 * string 类型表单输入：原生 <input type="text">
 *
 * 对外接口统一：modelValue + update:modelValue，让外层能用 v-model 调用。
 * 内部只做 type 匹配（任何值都 toString 成 '' 兜底），
 * 真正的 coerce 在 submitDialog 里统一调（主进程 insertRow/updateRow 会再处理一次）。
 */
const props = defineProps<{ modelValue: unknown; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <input
    type="text"
    class="tbl-form__input"
    :value="String(props.modelValue ?? '')"
    :disabled="props.disabled"
    @input="onInput"
  />
</template>
