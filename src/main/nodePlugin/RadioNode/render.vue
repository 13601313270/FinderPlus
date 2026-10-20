<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { RadioNode, type RadioOption } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { messages } from './i18n'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import RadioHelpDialog from './RadioHelpDialog.vue'

/**
 * 单选枚举节点渲染组件。
 *
 * 主视图：竖向排列的一组单选框（k/v 选项里的 k），点中即把该项的 v 按输出类型提交。
 * 输出类型与选项的增删改走右上角「齿轮」按钮——点击后打开全局 NodeDetailDialog
 * （中间栏的 RadioDetailPanel 负责渲染设置面板），不占用主界面。
 *
 * 节点现在有一个输入端口（接受 JsonValue），当收到有效 JSON 时，选项列表被覆盖——
 * 此时详情面板里的「选项编辑」区域会被禁用，仅保留输出类型切换；
 * 输入端口断开后自动回退到手动配置，选项编辑恢复可用。
 *
 * 定位、右侧输出端口由 NodeShell 兜底；节点不在场景里时退化为只读。
 */
const props = defineProps<{ id: string }>()

const radioNode = shallowRef<RadioNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => radioNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 齿轮按钮 → 打开全局详情弹窗
const { openNodeDetail } = useNodeDetail()

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const options = ref<readonly RadioOption[]>([])
const selectedId = ref<string | undefined>(undefined)

let unsubscribe: (() => void) | undefined


/** 把节点状态同步到本地 ref（引擎字段非响应式，靠 onChanged 桥接） */
function syncFromNode(node: RadioNode): void {
  // 浅拷贝，避免与 node 内部同一数组引用导致 Vue 跳过后重建
  options.value = [...node.displayOptions]
  selectedId.value = node.displaySelectedId
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof RadioNode) {
    radioNode.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

/** 选中某个选项 → 提交到输出端口 */
function onSelect(id: string): void {
  radioNode.value?.select(id)
}
</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" @help="showHelp = true">
      <template #actions>
        <button
          v-if="radioNode"
          class="node__gear"
          type="button"
          :title="t('settingsTitle')"
          @pointerdown.stop
          @click.stop="openNodeDetail(props.id)"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- 一组单选框：竖向排列 -->
    <div class="node__list">
      <button
        v-for="opt in options"
        :key="opt.id"
        class="node__option"
        :class="{ 'node__option--active': opt.id === selectedId }"
        type="button"
        :disabled="!radioNode"
        @click="onSelect(opt.id)"
      >
        <span class="node__radio" />
        <span class="node__label" :title="opt.label">{{ opt.label }}</span>
      </button>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <RadioHelpDialog />
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
  padding: 8px;
  padding-top: 0;

  &__gear {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    color: #6b7280;
    flex-shrink: 0;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: #111827;
      background: #f3f4f6;
    }

    &:active {
      background: #e5e7eb;
    }
  }

  // 一组单选框：竖向排列
  &__list {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    padding: 4px 0;
    min-height: 0;
    overflow: auto;
  }

  &__option {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 22px;
    padding: 0 6px;
    border-radius: 5px;
    color: @color-text;
    font-size: 12px;
    transition: background 0.15s;

    &:hover:not(:disabled) {
      background: #f3f4f6;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    &--active {
      color: @color-primary;

      .node__radio {
        border-color: @color-primary;

        &::after {
          transform: scale(1);
        }
      }
    }
  }

  // 单选框圆点（外圈 + 内点）
  &__radio {
    position: relative;
    box-sizing: border-box;
    width: 14px;
    height: 14px;
    border: 2px solid #cbd5e1;
    border-radius: 50%;
    flex-shrink: 0;
    transition: border-color 0.15s;

    &::after {
      content: '';
      position: absolute;
      inset: 1px;
      border-radius: 50%;
      background: @color-primary;
      transform: scale(0);
      transition: transform 0.15s;
    }
  }

  &__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
