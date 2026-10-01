<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { BoolInputNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'

/**
 * 布尔开关节点的渲染组件（只画卡片内容）。
 *
 * 定位、两侧端口这些所有节点共用的东西由 NodeShell 兜底，这里不碰：
 * - 卡片不再自己 `position: absolute`，直接填满外壳；
 * - 端口圆点由 NodeShell 里的 <NodePorts> 统一画。
 *
 * id 指明它控制场景里的哪个节点；渲染进程直接握住同一份 Scene 单例，
 * 所以用 workspaceScene.getNode(id) 取活引用，不用走 IPC。
 */
const props = defineProps<{ id: string }>()

const boolNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof BoolInputNode ? node : undefined
})

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => boolNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

/** 引擎字段是普通类字段，Vue 追踪不到，所以走 Node.onChanged 这条桥刷进本地 ref */
const checked = ref(false)

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = boolNode.value
  if (!node) return
  checked.value = node.bool
  offChanged = node.onChanged(() => {
    checked.value = node.bool
  })
})

onUnmounted(() => {
  offChanged?.()
})

// 只要拖拽（落点写回 node.position）；位置本身由外壳跟随 node.position 展示。
const { startDrag } = useNodePosition(() => boolNode.value)

/** 点击开关 → 翻转并提交到输出端口 */
function onToggle(): void {
  boolNode.value?.toggle()
}
</script>

<template>
  <div class="node">
    <span class="node__handle" :title="t('dragHint')" @pointerdown="startDrag">{{ nodeTitle }}</span>
    <div class="node__row">
      <button
        class="node__switch"
        :class="{ 'node__switch--on': checked }"
        type="button"
        role="switch"
        :aria-checked="checked"
        :disabled="!boolNode"
        :title="checked ? t('clickToClose') : t('clickToOpen')"
        @click="onToggle"
      >
        <span class="node__knob" />
      </button>
      <span class="node__state">{{ checked ? 'true' : 'false' }}</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: auto; // 内容超出 box 时可滚
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

    &:active {
      cursor: grabbing;
    }
  }

  &__row {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  // 开关轨道
  &__switch {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    position: relative;
    width: 44px;
    height: 24px;
    border-radius: 12px;
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

  // 开关滑块
  &__knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: transform 0.2s;
  }

  &__switch--on &__knob {
    transform: translateX(20px);
  }

  &__state {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: @color-text-weak;
    user-select: none;
  }
}
</style>