<script setup lang="ts">
import { defineComponent, h, ref, type PropType } from 'vue'

/**
 * 递归 JSON 折叠树组件。通用、无 i18n 依赖——
 * collapse/expand 的 hover 提示通过 props 传入（默认英文）。
 *
 * 内部用 JsonTreeNodeInner（defineComponent + render function）
 * 支持递归嵌套；外层 JsonTreeNode.vue 只负责初始调用。
 */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

function valueClass(v: unknown): string {
  if (v === null) return 'jt-null'
  if (typeof v === 'string') return 'jt-string'
  if (typeof v === 'number') return 'jt-number'
  if (typeof v === 'boolean') return 'jt-bool'
  return ''
}

function formatValue(v: unknown): string {
  if (v === null) return 'null'
  if (typeof v === 'string') return `"${v}"`
  return String(v)
}

const JsonTreeNodeInner = defineComponent({
  name: 'JsonTreeNodeInner',
  props: {
    nodeKey: { type: [String, Number] as PropType<string | number | null>, default: null },
    value: { type: undefined as unknown as () => unknown, required: true },
    defaultExpanded: { type: Boolean, default: true },
    collapseTitle: { type: String, default: 'Collapse' },
    expandTitle: { type: String, default: 'Expand' },
    depth: { type: Number, default: 0 }
  },
  setup(props) {
    const expanded = ref(props.defaultExpanded)
    function toggle() { expanded.value = !expanded.value }

    return () => {
      const isObj = isPlainObject(props.value)
      const isArr = isArray(props.value)
      const isContainer = isObj || isArr

      const entries: [string | number, unknown][] = isObj
        ? Object.entries(props.value as Record<string, unknown>)
        : isArr
          ? (props.value as unknown[]).map((v, i) => [i, v])
          : []
      const count = entries.length

      const showKey = props.nodeKey !== null

      // —— jt-head：总是有的首行（单行 nowrap）——
      const head: any[] = []
      if (showKey) {
        head.push(h('span', { class: 'jt-key' }, String(props.nodeKey)))
        head.push(h('span', { class: 'jt-colon' }, ': '))
      }

      if (isContainer) {
        head.push(h('span', {
          class: 'jt-toggle',
          onClick: toggle,
          title: expanded.value ? props.collapseTitle : props.expandTitle
        }, expanded.value ? '▼' : '▶'))
        head.push(h('span', { class: 'jt-bracket' }, isObj ? '{' : '['))

        if (!expanded.value || count === 0) {
          if (!expanded.value) {
            head.push(h('span', { class: 'jt-summary' }, ` ${count} ${isObj ? 'keys' : 'items'} `))
          }
          head.push(h('span', { class: 'jt-bracket' }, isObj ? '}' : ']'))
        }
      } else {
        head.push(h('span', { class: valueClass(props.value) }, formatValue(props.value)))
      }

      const result: any[] = [h('div', { class: 'jt-head' }, head)]

      if (isContainer && expanded.value && count > 0) {
        const childNodes = entries.map(([k, v]) =>
          h(JsonTreeNodeInner, {
            nodeKey: k,
            value: v,
            defaultExpanded: false,
            collapseTitle: props.collapseTitle,
            expandTitle: props.expandTitle,
            depth: props.depth + 1
          })
        )
        result.push(h('div', { class: 'jt-body' }, childNodes))
        result.push(h('div', { class: 'jt-close' }, [
          h('span', { class: 'jt-bracket' }, isObj ? '}' : ']')
        ]))
      }

      return h('div', {
        class: 'jt-node',
        style: { paddingLeft: `${props.depth * 16}px` }
      }, result)
    }
  }
})

defineProps<{
  value: unknown
  defaultExpanded?: boolean
  collapseTitle?: string
  expandTitle?: string
}>()
</script>

<template>
  <JsonTreeNodeInner
    :value="value"
    :default-expanded="defaultExpanded"
    :collapse-title="collapseTitle"
    :expand-title="expandTitle"
    :depth="0"
  />
</template>

<style>
.jt-head {
  white-space: nowrap;
}

.jt-key {
  color: #8b5cf6;
}

.jt-colon {
  color: #6b7280;
}

.jt-toggle {
  display: inline-block;
  width: 14px;
  cursor: pointer;
  color: #6b7280;
  user-select: none;

  &:hover { color: #374151; }
}

.jt-bracket {
  color: #374151;
  font-weight: 600;
}

.jt-summary {
  color: #9aa2ad;
  font-size: 12px;
}

.jt-string { color: #16a34a; }
.jt-number { color: #2563eb; }
.jt-bool   { color: #ea580c; }
.jt-null   { color: #9aa2ad; font-style: italic; }
</style>
