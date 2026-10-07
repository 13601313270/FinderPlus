<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { RadioNode, type RadioOption, type RadioValueKind } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import RadioHelpDialog from './RadioHelpDialog.vue'

/**
 * 单选枚举节点渲染组件。
 *
 * 主视图：竖向排列的一组单选框（k/v 选项里的 k），点中即把该项的 v 按输出类型提交。
 * 输出类型与选项的增删改走右上角「齿轮」设置面板（popover），不占用主界面。
 *
 * 定位、右侧输出端口由 NodeShell 兜底；节点不在场景里时退化为只读。
 */
const props = defineProps<{ id: string }>()

const radioNode = shallowRef<RadioNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => radioNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const options = ref<readonly RadioOption[]>([])
const kind = ref<RadioValueKind>('string')
const selectedId = ref<string | undefined>(undefined)

let unsubscribe: (() => void) | undefined


/** 把节点状态同步到本地 ref（引擎字段非响应式，靠 onChanged 桥接） */
function syncFromNode(node: RadioNode): void {
  // 浅拷贝，避免与 node 内部同一数组引用导致 Vue 跳过后重建
  options.value = [...node.displayOptions]
  kind.value = node.displayKind
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
  document.removeEventListener('click', onDocClick, true)
})

/** 选中某个选项 → 提交到输出端口 */
function onSelect(id: string): void {
  radioNode.value?.select(id)
}

// —— 选项操作 ——

function onAddOption(): void {
  radioNode.value?.addOption()
}

function onRemoveOption(id: string): void {
  radioNode.value?.removeOption(id)
}

function onLabelInput(id: string, e: Event): void {
  radioNode.value?.setOptionLabel(id, (e.target as HTMLInputElement).value)
}

function onValueInput(id: string, e: Event): void {
  radioNode.value?.setOptionValue(id, (e.target as HTMLInputElement).value)
}

/** 切换输出端口数据类型 */
function onKindChange(e: Event): void {
  radioNode.value?.setKind((e.target as HTMLSelectElement).value as RadioValueKind)
}

// —— 齿轮设置面板（popover，Teleport 到 body 避免被节点 overflow 裁剪）——

const gearBtn = ref<HTMLButtonElement | null>(null)
const popoverVisible = ref(false)
const popoverPos = ref<{ top: number; left: number }>({ top: 0, left: 0 })

function openSettings(): void {
  nextTick(() => {
    const rect = gearBtn.value?.getBoundingClientRect()
    if (rect) {
      popoverPos.value = { top: rect.bottom + 6, left: Math.max(8, rect.right - 280) }
    }
    popoverVisible.value = true
    document.addEventListener('click', onDocClick, true)
  })
}

function closeSettings(): void {
  popoverVisible.value = false
  document.removeEventListener('click', onDocClick, true)
}

function onGearClick(e: MouseEvent): void {
  e.stopPropagation()
  if (popoverVisible.value) {
    closeSettings()
    return
  }
  openSettings()
}

function onDocClick(e: MouseEvent): void {
  const pop = document.querySelector('.radio-popover')
  if (pop && pop.contains(e.target as Node)) return
  closeSettings()
}
</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" @help="showHelp = true">
      <template #actions>
        <button
          v-if="radioNode"
          ref="gearBtn"
          class="node__gear"
          type="button"
          :title="t('settingsTitle')"
          @pointerdown.stop
          @click.stop="onGearClick"
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

  <!-- 齿轮设置面板：输出类型 + 选项增删改 -->
  <Teleport to="body">
    <div
      v-if="popoverVisible"
      class="radio-popover"
      :style="{ top: popoverPos.top + 'px', left: popoverPos.left + 'px' }"
      @click.stop
    >
      <div class="radio-popover__title">{{ t('settingsTitle') }}</div>

      <label class="radio-popover__type">
        <span class="radio-popover__type-label">{{ t('outputTypeLabel') }}</span>
        <select class="radio-popover__select" :value="kind" @change="onKindChange">
          <option value="string">string</option>
          <option value="number">number</option>
        </select>
      </label>

      <div class="radio-popover__section">
        <div class="radio-popover__section-head">
          <span>{{ t('optionsTitle') }}</span>
          <button
            class="radio-popover__add"
            type="button"
            :title="t('addOptionHint')"
            @click="onAddOption"
          >＋</button>
        </div>
        <div class="radio-popover__list">
          <div v-for="opt in options" :key="opt.id" class="radio-popover__row">
            <input
              class="radio-popover__input"
              type="text"
              :value="opt.label"
              :placeholder="t('labelPlaceholder')"
              @input="(e) => onLabelInput(opt.id, e)"
            />
            <input
              class="radio-popover__input"
              :type="kind === 'number' ? 'number' : 'text'"
              step="any"
              :value="opt.value"
              :placeholder="t('valuePlaceholder')"
              @input="(e) => onValueInput(opt.id, e)"
            />
            <button
              class="radio-popover__remove"
              type="button"
              :title="t('removeOptionHint')"
              :disabled="options.length <= 1"
              @click="onRemoveOption(opt.id)"
            >×</button>
          </div>
        </div>
      </div>

      <div class="radio-popover__hint">{{ t('valueHint') }}</div>
    </div>
  </Teleport>
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
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

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

// 设置面板 popover（Teleport 到 body）
.radio-popover {
  position: fixed;
  z-index: 2000;
  width: 280px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__title {
    font-size: 12px;
    color: #6b7280;
  }

  &__type {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__type-label {
    font-size: 12px;
    color: #6b7280;
  }

  &__select {
    flex: 1;
    box-sizing: border-box;
    padding: 4px 6px;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #1f2937;
    border: 1px solid @node-border-color;
    border-radius: 6px;
    background: #fff;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #3b82f6;
    }
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-top: 1px dashed #e5e7eb;
    padding-top: 8px;
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: #6b7280;
  }

  &__add {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    background: #f3f4f6;
    color: #374151;
    font-size: 13px;
    font-weight: 700;
    line-height: 1;

    &:hover {
      background: #e5e7eb;
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 220px;
    overflow: auto;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    padding: 4px 6px;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #1f2937;
    border: 1px solid @node-border-color;
    border-radius: 6px;
    background: #fff;
    outline: none;
    cursor: text;

    &:focus {
      border-color: #3b82f6;
    }
  }

  &__remove {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    color: #9aa2ad;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      color: #dc2626;
      background: #fee2e2;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  }

  &__hint {
    font-size: 10px;
    line-height: 1.5;
    color: #9aa2ad;
  }
}
</style>