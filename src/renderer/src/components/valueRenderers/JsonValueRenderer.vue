<script setup lang="ts">
/**
 * JsonValue 渲染器：tooltip 模式展示摘要，detail 模式完整折叠树。
 * 内部复用现有的 JsonTreeNode 组件。
 */
import { computed } from 'vue'
import JsonTreeNode from '../JsonTreeNode.vue'

const props = defineProps<{
  value: { value?: unknown; displayLabel: string }
  context?: 'tooltip' | 'detail' | 'inline'
}>()

const showTree = computed(() => props.context === 'detail')
</script>

<template>
  <!-- tooltip / inline：一行摘要 -->
  <span v-if="!showTree" class="v-json">{{ value.displayLabel }}</span>
  <!-- detail：完整折叠树 -->
  <div v-else class="v-json-tree">
    <JsonTreeNode
      v-if="value.value !== undefined"
      :value="value.value"
      :default-expanded="false"
    />
    <span v-else class="v-null">(null)</span>
  </div>
</template>

<style scoped lang="less">
.v-json {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #8b5cf6;
  font-size: 10px;
}

.v-json-tree {
  // JsonTreeNode 自带样式，这里只给容器加个边框包裹感
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 6px 8px;
}

.v-null {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #9ca3af;
  font-style: italic;
  font-size: 10px;
}
</style>
