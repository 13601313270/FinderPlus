<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'

/**
 * 通用帮助弹窗壳：
 * - Teleport 到 body，全屏遮罩
 * - Esc / 点遮罩 / 点 × 按钮均可关闭，统一 emit('close')
 * - 正文通过默认 slot 传入，各节点只需写自己的 <NodeHelpContent />
 *
 * 用法：
 *   <HelpDialog :visible="showHelp" title="代码节点使用说明" @close="showHelp = false">
 *     <CodeHelpContent />
 *   </HelpDialog>
 */
const props = defineProps<{
  visible: boolean
  title?: string
  /** 弹窗宽度，默认 560px。传数字按 px，传字符串原样用（如 '80vw'） */
  width?: number | string
}>()

const emit = defineEmits<{ close: [] }>()

const dialogStyle = computed(() => {
  if (props.width === undefined) return {}
  return { width: typeof props.width === 'number' ? `${props.width}px` : props.width }
})

function onMaskClick(): void {
  emit('close')
}

function onDialogClick(e: MouseEvent): void {
  e.stopPropagation()
}

function onKeyDown(e: KeyboardEvent): void {
  if (props.visible && e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="help-mask" @click="onMaskClick">
      <div class="help-dialog" :style="dialogStyle" @click="onDialogClick">
        <div class="help-dialog__header">
          <h3 class="help-dialog__title">{{ title ?? '使用说明' }}</h3>
          <button
            class="help-dialog__close"
            type="button"
            title="关闭（Esc）"
            @click="emit('close')"
          >×</button>
        </div>
        <div class="help-dialog__body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.help-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: helpFadeIn 0.15s ease;
}

.help-dialog {
  width: 560px;
  max-height: 80vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: helpPopIn 0.18s ease;
  overflow: hidden;
  /* 画布上各节点都加了 user-select: none，这里显式覆盖让帮助文档内容可选 */
  user-select: text;
  -webkit-user-select: text;

  &__header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  &__title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
  }

  &__close {
    all: unset;
    cursor: pointer;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: #9ca3af;
    font-size: 20px;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #f3f4f6;
      color: #374151;
    }
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px 20px;
  }
}

@keyframes helpFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes helpPopIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
