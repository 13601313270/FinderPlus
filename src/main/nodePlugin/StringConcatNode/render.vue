<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { StringConcatNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

/**
 * 字符串拼接节点的渲染组件（只画卡片内容）。
 *
 * 定位、两侧端口圆点由 NodeShell 统一兜底——左侧的输入端口从 $1、$2… 依次排列，
 * 用户照着端口标签在模板里写 $N 即可。这里只负责模板输入框、端口增删按钮和结果预览。
 */
const props = defineProps<{ id: string }>()

const concatNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof StringConcatNode ? node : undefined
})

const templateValue = ref('')
const resultValue = ref('')
const inputCount = ref(0)

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = concatNode.value
  if (!node) return
  sync(node)
  offChanged = node.onChanged(() => {
    if (concatNode.value) sync(concatNode.value)
  })
})

onUnmounted(() => {
  offChanged?.()
})

function sync(node: StringConcatNode): void {
  templateValue.value = node.templateText
  resultValue.value = node.displayResult
  inputCount.value = node.inputCount
}

// 拖拽（落点写回 node.position）；位置本身由外壳跟随 node.position 展示。
const { startDrag } = useNodePosition(() => concatNode.value)

/** 模板框敲字 → 更新模板并立即重算 */
function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  concatNode.value?.setTemplate(target.value)
}

function onAddPort(): void {
  concatNode.value?.addInputPort()
}

function onRemovePort(): void {
  concatNode.value?.removeLastInputPort()
}

/**
 * 滚动接力：textarea 还能往当前方向滚时才 stop，
 * 滚到顶/底了就放行让画布接管平移。
 */
function onTextareaWheel(e: WheelEvent): void {
  const el = e.currentTarget as HTMLTextAreaElement
  const { scrollTop, scrollHeight, clientHeight } = el
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight

  const scrollingUp = e.deltaY < 0
  const scrollingDown = e.deltaY > 0

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return
  e.stopPropagation()
}
</script>

<template>
  <div class="node">
    <div class="node__header" @pointerdown="startDrag">
      <span class="node__handle" title="拖动节点">{{ concatNode?.type ?? '?' }}</span>
    </div>

    <textarea
      class="node__template"
      rows="3"
      :value="templateValue"
      :disabled="!concatNode"
      placeholder="模板，例：https://$1/$2"
      @wheel="onTextareaWheel"
      @input="onInput"
    />

    <div class="node__ports">
      <span class="node__ports-count">输入端口：{{ inputCount }} 个</span>
      <div class="node__ports-actions">
        <button
          class="node__btn"
          type="button"
          title="移除末尾输入端口"
          :disabled="!concatNode || inputCount <= 1"
          @click="onRemovePort"
        >
          －
        </button>
        <button
          class="node__btn"
          type="button"
          title="新增输入端口"
          :disabled="!concatNode"
          @click="onAddPort"
        >
          ＋
        </button>
      </div>
    </div>

    <div class="node__result" :title="resultValue">{{ resultValue || '（结果）' }}</div>
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    display: flex;
    align-items: center;
    cursor: grab;
    user-select: none;
    border-bottom: 1px dashed #d5d9e0;
    padding-bottom: 4px;

    &:active {
      cursor: grabbing;
    }
  }

  &__handle {
    font-size: 12px;
    color: @color-text-weak;
    padding: 2px 0;
  }

  &__template {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    border: 1px solid #d5d9e0;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
    flex-shrink: 0;

    &:disabled {
      opacity: 0.5;
    }
  }

  &__ports {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: @color-text-weak;
    flex-shrink: 0;
  }

  &__ports-actions {
    display: flex;
    gap: 4px;
  }

  &__btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 1px solid #d5d9e0;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1;
    color: @color-text;

    &:hover:not(:disabled) {
      border-color: @color-primary;
      color: @color-primary;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }
  }

  &__result {
    flex-shrink: 0;
    padding: 6px 8px;
    border: 1px solid #e5e8ee;
    border-radius: 6px;
    background: #f7f8fa;
    font-size: 12px;
    color: @color-text;
    white-space: pre-wrap;
    word-break: break-all;
    overflow: hidden;
    max-height: 56px;
  }
}
</style>