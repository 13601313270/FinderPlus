<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * 节点卡片通用头部：可拖拽的标题栏 + 右侧操作区 slot + 统一 help 按钮。
 *
 * 三个核心逻辑都在上层收口了，render.vue 只需要传 :title 和 @help：
 *  - 拖拽：NodeShell/NodeWire provide('nodeStartDrag') → inject 自动拿
 *  - title hover 提示：全局 i18n nodeHeader.dragHint（所有节点一致）
 *  - help 按钮 hover 提示：全局 i18n nodeHeader.helpTitle（所有节点一致）
 *
 * 用法示例：
 * <NodeHeader :title="nodeTitle" @help="showHelp = true">
 *   <template #actions>
 *     <button @click="openGear()">⚙️</button>
 *   </template>
 * </NodeHeader>
 *
 * 不需要 help 按钮的节点传 :hide-help="true"。
 */
interface Props {
  /** 标题文字（节点名） */
  title: string
  /** 标题 hover 提示覆盖。不传用全局 i18n nodeHeader.dragHint */
  titleHint?: string
  /** help 按钮 hover 提示覆盖。不传用全局 i18n nodeHeader.helpTitle */
  helpTitle?: string
  /** 设为 true 则不渲染 help 按钮 */
  hideHelp?: boolean
  /** 拖拽处理器覆盖。不传则用 NodeShell/NodeWire provide 的 nodeStartDrag */
  dragHandler?: (e: PointerEvent) => void
  /** justify-content，默认 'space-between' */
  justify?: 'space-between' | 'center' | 'flex-start'
  /** 内边距，默认 '4px 0' */
  padding?: string
  /** 固定高度，不传则由内容撑开 */
  height?: string
  /** align-items，默认 'center' */
  alignItems?: 'center' | 'baseline'
}

const props = withDefaults(defineProps<Props>(), {
  justify: 'space-between',
  padding: '4px 0',
  alignItems: 'center',
  hideHelp: false
})

const emit = defineEmits<{
  (e: 'help'): void
}>()

const { t } = useI18n()

// 默认从外层外壳注入 startDrag — render.vue 不用再自己调 useNodePosition
const injectedDrag = inject<(e: PointerEvent) => void>('nodeStartDrag')

/** 最终生效的拖拽处理器：显式传入优先，否则用注入的 */
const effectiveDrag = (e: PointerEvent) => {
  const h = props.dragHandler ?? injectedDrag
  h?.(e)
}

/** 最终生效的标题 hover 提示：显式传入优先，否则用全局 i18n */
const effectiveTitleHint = () => props.titleHint ?? t('nodeHeader.dragHint')

/** 最终生效的 help 按钮 hover 提示：显式传入优先，否则用全局 i18n */
const effectiveHelpTitle = () => props.helpTitle ?? t('nodeHeader.helpTitle')
</script>

<template>
  <div
    class="node-header"
    :style="{
      justifyContent: justify,
      padding,
      height,
      alignItems
    }"
    @pointerdown="effectiveDrag"
  >
    <span class="node-header__handle" :title="effectiveTitleHint()">{{ title }}</span>
    <div class="node-header__actions">
      <slot name="actions" />
      <button
        v-if="!hideHelp"
        class="node-header__help"
        type="button"
        :title="effectiveHelpTitle()"
        @pointerdown.stop
        @click.stop="emit('help')"
      >?</button>
    </div>
  </div>
</template>

<style scoped lang="less">
.node-header {
  position: relative;
  display: flex;
  border-bottom: 1px dashed @node-border-color;
  cursor: grab;
  user-select: none;
  flex-shrink: 0;

  &:active {
    cursor: grabbing;
  }

  &__handle {
    font-size: 12px;
    color: @color-text-weak;
    padding: 2px 0;
    flex: 1; // 撑满空间，让 actions 靠右
    cursor: grab;
    user-select: none;
  }

  &__actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  &__help {
    all: unset;
    cursor: pointer;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }
}
</style>
