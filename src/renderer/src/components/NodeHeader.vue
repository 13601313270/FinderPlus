<script setup lang="ts">
/**
 * 节点卡片通用头部：可拖拽的标题栏 + 右侧操作区 slot + 可选 help 按钮。
 *
 * 大多数节点的右上角都有一个「?」帮助按钮，逻辑完全重复（title + stop pointerdown + emit click），
 * 所以这里统一收口。其他自定义按钮（齿轮、配置、状态标签等）放 #actions slot 会排在 help 左边。
 *
 * 用法示例：
 * <NodeHeader
 *   :title="nodeTitle"
 *   title-hint="拖动以移动节点"
 *   :drag-handler="startDrag"
 *   help-title="打开帮助"
 *   @help="showHelp = true"
 * >
 *   <template #actions>
 *     <button @click="openGear()">⚙️</button>
 *   </template>
 * </NodeHeader>
 */
interface Props {
  /** 标题文字（节点名） */
  title: string
  /** 标题 hover 提示（原生 title 属性） */
  titleHint?: string
  /** 拖拽处理器：绑在 header 容器的 @pointerdown 上。不传则不绑定（某些节点 drag 绑在别处） */
  dragHandler?: (e: PointerEvent) => void
  /** help 按钮的 hover 提示。不传则不渲染 help 按钮 */
  helpTitle?: string
  /** justify-content，默认 'space-between' */
  justify?: 'space-between' | 'center' | 'flex-start'
  /** 固定高度，不传则由内容撑开 */
  height?: string
  /** align-items，默认 'center' */
  alignItems?: 'center' | 'baseline'
}

const props = withDefaults(defineProps<Props>(), {
  justify: 'space-between',
  padding: '4px 0',
  alignItems: 'center'
})

const emit = defineEmits<{
  (e: 'help'): void
}>()
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
    @pointerdown="dragHandler"
  >
    <span class="node-header__handle" :title="titleHint">{{ title }}</span>
    <div class="node-header__actions">
      <slot name="actions" />
      <button
        v-if="helpTitle"
        class="node-header__help"
        type="button"
        :title="helpTitle"
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
