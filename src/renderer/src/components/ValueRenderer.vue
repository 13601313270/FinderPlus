<script setup lang="ts">
/**
 * Value 通用包装组件：根据 Value 的 VALUE_NAME 自动选对应 renderer。
 *
 * 使用场景：任何需要展示 Value 实例的地方，不再需要手动 switch-on-type。
 * 用法：
 *   <ValueRenderer :value="port.currentValue" context="tooltip" />
 *   <ValueRenderer :value="someJsonValue" context="detail" />
 *
 * context 说明：同一 Value 在不同语境展示形态不同
 *   - 'tooltip' 紧凑形态（端口气泡内，空间有限）
 *   - 'detail'  详细形态（NodeDetailDialog 三栏，空间充裕）
 *   - 'inline'  行内形态（默认，通用紧凑展示）
 *
 * @resize 事件：某些 renderer（ImgFileValue 等）内容加载后会撑大，
 *   父组件（如 NodePort tooltip）可以监听它重新定位。
 */
import { computed } from 'vue'
import type { Value } from '../../../main/engine/data/Value'
import { resolveRenderer, NullValueRenderer } from './valueRenderers/index'

const props = defineProps<{
  value: Value
  context?: 'tooltip' | 'detail' | 'inline'
}>()

defineEmits<{
  resize: []
}>()

/** 从 Value 实例上读静态 VALUE_NAME */
const kind = computed(() =>
  ((props.value.constructor as unknown) as { VALUE_NAME: string }).VALUE_NAME
)

/** isNull 的值一律走 NullValueRenderer，不管 kind 是什么 */
const targetComp = computed(() => {
  if (props.value.isNull) return NullValueRenderer
  return resolveRenderer(kind.value)
})
</script>

<template>
  <component :is="targetComp" :value="value" :context="context ?? 'inline'" />
</template>
