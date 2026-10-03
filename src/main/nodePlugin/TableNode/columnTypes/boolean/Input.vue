<script setup lang="ts">
/**
 * boolean 类型表单输入：switch 开关样式
 *
 * 对外接口统一：modelValue + update:modelValue。
 */
const props = withDefaults(defineProps<{ modelValue: unknown; disabled?: boolean }>(), {
  disabled: false
})

const checked = defineModel<boolean>('modelValue')

function onToggle(): void {
  if (props.disabled) return
  checked.value = !checked.value
}
</script>

<template>
  <div class="bool-switch">
    <button
      class="bool-switch__track"
      :class="{ 'bool-switch__track--on': checked }"
      type="button"
      role="switch"
      :aria-checked="checked"
      :disabled="props.disabled"
      @click="onToggle"
    >
      <span class="bool-switch__knob" />
    </button>
    <span class="bool-switch__label">{{ checked ? 'true' : 'false' }}</span>
  </div>
</template>

<style scoped lang="less">
.bool-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &__track {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    position: relative;
    width: 36px;
    height: 20px;
    border-radius: 10px;
    background: #cbd5e1;
    transition: background 0.2s;
    flex-shrink: 0;

    &--on {
      background: @color-primary;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &__knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }

  &__track--on &__knob {
    transform: translateX(16px);
  }

  &__label {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: @color-text-weak;
    user-select: none;
  }
}
</style>
