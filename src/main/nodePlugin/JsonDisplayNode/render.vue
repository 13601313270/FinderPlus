<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, defineComponent, h } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { JsonDisplayNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { viewport } from '@renderer/canvas/viewport'

const props = defineProps<{ id: string }>()

const displayNode = shallowRef<JsonDisplayNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => displayNode.value, '?')
const parsed = ref<unknown>(undefined)
const parseError = ref<string | null>(null)
const hasInput = ref(false)

let unsubscribe: (() => void) | undefined

const { startDrag } = useNodePosition(() => displayNode.value)

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof JsonDisplayNode) {
    displayNode.value = found
    parsed.value = found.value
    parseError.value = found.parseError
    hasInput.value = found.hasInput
    unsubscribe = found.onChanged(() => {
      parsed.value = found.value
      parseError.value = found.parseError
      hasInput.value = found.hasInput
    })
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

function onNodeWheel(e: WheelEvent): void {
  const el = e.currentTarget as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = el
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight

  const scrollingUp = e.deltaY < 0
  const scrollingDown = e.deltaY > 0

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return

  e.stopPropagation()
}

// —— resize handle 拖拽 ——
const MIN_WIDTH = 200
const MAX_WIDTH = 800
const MIN_HEIGHT = 120
const MAX_HEIGHT = 600

function onResizePointerDown(e: PointerEvent): void {
  const n = displayNode.value
  if (!n) return
  e.stopPropagation()
  e.preventDefault()

  const startClientX = e.clientX
  const startClientY = e.clientY
  const [startWidth, startHeight] = n.box

  function move(ev: PointerEvent): void {
    const cur = displayNode.value
    if (!cur) { end(); return }
    const scale = viewport.scale || 1
    const deltaW = (ev.clientX - startClientX) / scale
    const deltaH = (ev.clientY - startClientY) / scale
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(startWidth + deltaW)))
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(startHeight + deltaH)))
    cur.setBox(newWidth, newHeight)
  }
  function end(): void {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}

// —— JSON 类型判断 ——
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

// —— 递归 JSON 节点组件 ——
const JsonTreeNode = defineComponent({
  name: 'JsonTreeNode',
  props: {
    nodeKey: { type: [String, Number], default: null },
    value: { type: undefined as unknown as () => unknown, required: true },
    defaultExpanded: { type: Boolean, default: true },
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

      const nodeKey = props.nodeKey
      const showKey = nodeKey !== null

      // —— jt-head：总是有的首行（单行 nowrap）——
      const head: any[] = []
      if (showKey) {
        head.push(h('span', { class: 'jt-key' }, String(nodeKey)))
        head.push(h('span', { class: 'jt-colon' }, ': '))
      }

      if (isContainer) {
        head.push(h('span', {
          class: 'jt-toggle',
          onClick: toggle,
          title: expanded.value ? '收起' : '展开'
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
        // 子节点 depth + 1，每个节点自己管理缩进 padding
        const childNodes = entries.map(([k, v]) =>
          h(JsonTreeNode, { nodeKey: k, value: v, defaultExpanded: false, depth: props.depth + 1 })
        )
        result.push(h('div', { class: 'jt-body' }, childNodes))
        result.push(h('div', { class: 'jt-close' }, [
          h('span', { class: 'jt-bracket' }, isObj ? '}' : ']')
        ]))
      }

      // 缩进：每个节点根元素直接用 inline style 设置 padding-left
      return h('div', {
        class: 'jt-node',
        style: { paddingLeft: `${props.depth * 16}px` }
      }, result)
    }
  }
})

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
</script>

<template>
  <div class="node">
    <span class="node__handle" title="拖动节点" @pointerdown="startDrag">{{ nodeTitle }}</span>

    <div class="render-body" @wheel="onNodeWheel">
      <!-- 还没接过输入 -->
      <div v-if="!hasInput" class="render-empty">（暂无输入）</div>

      <!-- 解析失败 -->
      <div v-else-if="parseError" class="render-error">
        <div class="render-error__title">JSON 解析失败</div>
        <div class="render-error__msg">{{ parseError }}</div>
      </div>

      <!-- 空值（上游传来的是空字符串） -->
      <div v-else-if="parsed === undefined" class="render-empty">（空输入）</div>

      <!-- 解析成功 → 折叠树 -->
      <JsonTreeNode v-else :value="parsed" :default-expanded="true" />
    </div>

    <div
      v-if="displayNode"
      class="node__resize-handle"
      @pointerdown.stop.prevent="onResizePointerDown"
      title="拖拽调整节点大小"
    />
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__handle {
    cursor: grab;
    user-select: none;
    font-size: 12px;
    color: @color-text-weak;
    text-align: center;
    padding: 2px 0;
    border-bottom: 1px dashed #d5d9e0;

    &:active { cursor: grabbing; }
  }

  &__resize-handle {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
    background: transparent;
    border-right: 2px solid #b0b7c3;
    border-bottom: 2px solid #b0b7c3;
    border-bottom-right-radius: 4px;
  }
}

.render-body {
  flex: 1;
  overflow: auto;
  padding: 6px 8px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 13px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
}

.render-empty {
  color: #9aa2ad;
  font-style: italic;
}

.render-error {
  &__title {
    color: #e54d42;
    font-weight: 600;
    margin-bottom: 4px;
  }
  &__msg {
    color: #c45656;
    font-size: 12px;
    word-break: break-all;
  }
}

// —— JSON 树节点样式 ——
.jt-node {
  // 缩进由 inline style 的 paddingLeft 控制（depth * 16px），这里不需要再设
}

.jt-head {
  white-space: nowrap;
}

.jt-body {
  // 纯容器：子节点自己有 paddingLeft 管理缩进，这里不加任何 padding/margin
}

.jt-close {
  // 闭合括号：跟 jt-head 同级，同样由 inline style 控制缩进
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
