<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { BufferNode, type BufferKind } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import BufferHelpDialog from './BufferHelpDialog.vue'

/**
 * 栈 / 队列节点共用的渲染组件（只画卡片内容）。
 *
 * 卡片内容分四块：数据类型下拉、已进入数量、「出」按钮。
 * 标题走插件 manifest 的多语言 title（栈 / 队列各自的 title 由 useNodeTitle 解析）。
 *
 * 定位、两侧端口由 NodeShell 兜底；节点不在场景里时退化为只读。
 */
const props = defineProps<{ id: string }>()

const bufferNode = shallowRef<BufferNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => bufferNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（栈 / 队列共用一份），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

/** 可选数据类型，顺序即下拉顺序 */
const KIND_OPTIONS: readonly BufferKind[] = ['number', 'string', 'bool', 'file', 'imgfile', 'json']

const kind = ref<BufferKind>('number')
const count = ref(0)
const empty = ref(true)

let unsubscribe: (() => void) | undefined

/** 把节点里的状态同步到本地 ref */
function sync(node: BufferNode): void {
  kind.value = node.displayKind
  count.value = node.count
  empty.value = node.isEmpty
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof BufferNode) {
    bufferNode.value = found
    sync(found)
    unsubscribe = found.onChanged(() => sync(found))
  }
})

onUnmounted(() => {
  unsubscribe?.()
})


/** 切换数据类型：节点侧同步重建输入 / 输出端口 */
function onKindChange(e: Event): void {
  bufferNode.value?.setKind((e.target as HTMLSelectElement).value as BufferKind)
}

/** 出操作：取出一项发往下游 */
function onTake(): void {
  bufferNode.value?.take()
}
</script>

<template>
  <div class="node">
    <NodeHeader
      :title="nodeTitle"
      @help="showHelp = true"
    />

    <div class="buffer__row">
      <span class="buffer__label">{{ t('typeLabel') }}</span>
      <select
        class="buffer__select"
        :value="kind"
        :disabled="!bufferNode"
        @pointerdown.stop
        @change="onKindChange"
      >
        <option v-for="k in KIND_OPTIONS" :key="k" :value="k">{{ k }}</option>
      </select>
    </div>

    <div class="buffer__count">
      <span class="buffer__label">{{ t('countLabel') }}</span>
      <span class="buffer__count-value">{{ count }}</span>
    </div>

    <button
      class="buffer__take"
      type="button"
      :disabled="empty || !bufferNode"
      @pointerdown.stop
      @click="onTake"
    >
      {{ t('take') }}
    </button>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <BufferHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  padding-top: 0;
  overflow: hidden;
}

.buffer {
  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    flex-shrink: 0;
  }

  &__label {
    font-size: 11px;
    color: @color-text-weak;
    user-select: none;
  }

  &__select {
    box-sizing: border-box;
    flex: 1;
    min-width: 0;
    padding: 3px 6px;
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #1f2937;
    border: 1px solid @node-border-color;
    border-radius: 5px;
    background: @color-surface;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: @color-primary;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__count {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    border: 1px solid #e5e8ee;
    border-radius: 6px;
    flex-shrink: 0;
  }

  &__count-value {
    font-size: 15px;
    font-weight: 600;
    line-height: 1;
    color: @color-primary;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__take {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    background: @color-primary;
    cursor: pointer;
    flex-shrink: 0;
    transition: filter 0.15s;

    &:hover:not(:disabled) {
      filter: brightness(0.92);
    }

    &:active:not(:disabled) {
      filter: brightness(0.84);
    }

    &:disabled {
      background: #c7d2fe;
      cursor: not-allowed;
    }
  }
}
</style>