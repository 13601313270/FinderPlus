<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { debounce } from 'lodash-es'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { NumberInputNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import NumberInputHelpDialog from './NumberInputHelpDialog.vue'

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

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => inputNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

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

/** 500ms 防抖：连续敲击不立刻 commit，停半秒再发，避免 Edge 上刷大量中间值 */
const debouncedSetNumber = debounce((value: number) => {
  inputNode.value?.setNumber(value)
}, 500)

onUnmounted(() => {
  offChanged?.()
  debouncedSetNumber.cancel()
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
  debouncedSetNumber(value)
}


</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" @help="showHelp = true" />
    <input
      class="node__field"
      type="number"
      inputmode="decimal"
      step="any"
      :value="emitted"
      :disabled="!inputNode"
      :placeholder="t('placeholder')"
      @input="onNumberInput"
    />

  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <NumberInputHelpDialog />
  </HelpDialog>
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
  padding-top: 0;

  &__field {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid @node-border-color;
    border-radius: 6px;
    font-size: 14px;
    font-variant-numeric: tabular-nums;

    &:disabled {
      opacity: 0.5;
    }
  }

}
</style>
