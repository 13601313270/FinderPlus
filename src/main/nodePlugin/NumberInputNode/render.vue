<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { NumberInputNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

/**
 * 数字输入框节点的渲染组件（只画卡片内容）。
 *
 * 定位、两侧端口这些所有节点共用的东西由 NodeShell 兜底，这里不碰：
 * - 卡片不再自己 `position: absolute`，直接填满外壳；
 * - 端口圆点由 NodeShell 里的 <NodePorts> 统一画，不必每个 render.vue 再放一份。
 *
 * id 指明它控制场景里的哪个节点；引擎是纯逻辑，渲染进程能直接握住同一份
 * Scene 单例，所以这里用 workspaceScene.getNode(id) 取活引用，不用走 IPC。
 * 节点不在场景里（id 对不上或已被删）时退化为禁用输入框。
 */
const props = defineProps<{ id: string }>()

const inputNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof NumberInputNode ? node : undefined
})

/**
 * 已经提交到输出端口上的数值：输入框显示它以它为准，卡片底部的读数也用它。
 * 引擎字段是普通字段，Vue 追踪不到，所以走 Node.onChanged 这条桥（见 ARCHITECTURE 第 5 节）。
 */
const emitted = ref(0)

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = inputNode.value
  if (!node) return
  emitted.value = node.number
  offChanged = node.onChanged(() => {
    emitted.value = node.number
  })
})

onUnmounted(() => {
  offChanged?.()
})

/**
 * 只提交「已经是一个完整数字」的内容。
 * 空串、"-"、"1." 这类正在敲的半成品先不提交——免得把它们回写成 0 / NaN，把手打断
 * （浏览器对 type=number 的非法半成品会报空串，valueAsNumber 给 NaN，正好一并挡掉）。
 */
function onNumberInput(e: Event): void {
  const el = e.target as HTMLInputElement
  if (el.value.trim() === '') return
  const value = el.valueAsNumber
  if (!Number.isFinite(value)) return
  inputNode.value?.setNumber(value)
}

// 只要拖拽（落点写回 node.position）；位置本身由外壳跟随 node.position 展示。
const { startDrag } = useNodePosition(() => inputNode.value)
</script>

<template>
  <div class="node">
    <span class="node__handle" title="拖动节点" @pointerdown="startDrag">{{ inputNode?.type ?? '?' }}</span>
    <input
      class="node__field"
      type="number"
      inputmode="decimal"
      step="any"
      :value="emitted"
      :disabled="!inputNode"
      placeholder="输入数字…"
      @input="onNumberInput"
    />
    <!-- 输出读数：这张卡片只有一个输出端口，把**已经提交出去**的值就地显示出来，
         不接下游也能一眼确认「节点确实在输出」。
         注意框里被清空时（内容还不是一个完整数字）不提交新值，所以这里显示的仍是上一次
         真正发出去的数字——「已输出」这个措辞就是为这个语义服务的。 -->
    <span class="node__emit">
      已输出 <b>{{ emitted }}</b>
      <em class="node__kind">number</em>
    </span>
  </div>
</template>

<style scoped lang="less">
.node {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 220px;
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

    &:active {
      cursor: grabbing;
    }
  }

  &__field {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d5d9e0;
    border-radius: 6px;
    font-size: 14px;
    font-variant-numeric: tabular-nums;

    &:disabled {
      opacity: 0.5;
    }
  }

  &__emit {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 0 2px;
    font-size: 12px;
    color: @color-text-weak;

    b {
      color: @color-text;
      font-variant-numeric: tabular-nums;
    }
  }

  &__kind {
    margin-left: auto;
    font-style: normal;
    font-size: 11px;
    color: @color-text-weak;
  }
}
</style>
