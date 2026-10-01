<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  type CSSProperties
} from 'vue'
import ChevronIcon from './icons/ChevronIcon.vue'

/**
 * 自定义下拉选择器（替代原生 <select>，因为原生 option 无法放国旗/富文本）。
 * - 触发器展示「图标 + 文案 + chevron」，展开后浮层列出全部选项
 * - 点击外部 / Esc 关闭；上下键移动高亮、回车选中
 * - icon 可选，用于放国旗 emoji 之类的视觉标识
 *
 * 浮层用 Teleport 挂到 body、position: fixed 定位：
 * 因为外层弹窗（.gs-dialog / __body）有 overflow 裁剪，绝对定位会被切掉，
 * 所以按触发器的 getBoundingClientRect 计算位置，空间不够时向上翻转。
 */
export interface SelectOption {
  value: string
  label: string
  /** 可选前缀图标（如国旗 emoji） */
  icon?: string
}

const props = defineProps<{
  /** 当前选中值 */
  modelValue: string
  options: readonly SelectOption[]
  /** 无障碍标签（读屏用），一般传该设置项的标题 */
  ariaLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const rootEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const open = ref(false)
/** 键盘高亮的选项下标；-1 表示无高亮 */
const activeIndex = ref(-1)

/** 浮层最大高度，也是翻转判断的阈值 */
const MAX_POPUP_HEIGHT = 240
/** 浮层与触发器之间的间距 */
const POPUP_GAP = 4
/** 浮层距视口边缘的留白 */
const VIEWPORT_MARGIN = 8

/** 浮层定位（fixed 坐标系），展开时按触发器位置算出 */
const popupStyle = ref<CSSProperties>({})
/** 浮层当前是向上翻转的吗（决定动画方向） */
const flipped = ref(false)

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))

/** 按触发器位置计算浮层坐标；下方空间不够且上方更宽裕时向上翻转 */
function updatePosition(): void {
  const rect = triggerEl.value?.getBoundingClientRect()
  if (!rect) return

  const spaceBelow = window.innerHeight - rect.bottom - POPUP_GAP - VIEWPORT_MARGIN
  const spaceAbove = rect.top - POPUP_GAP - VIEWPORT_MARGIN
  const placeAbove = spaceBelow < MAX_POPUP_HEIGHT && spaceAbove > spaceBelow

  flipped.value = placeAbove
  popupStyle.value = {
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${Math.min(MAX_POPUP_HEIGHT, Math.max(80, placeAbove ? spaceAbove : spaceBelow))}px`,
    ...(placeAbove
      ? { bottom: `${window.innerHeight - rect.top + POPUP_GAP}px` }
      : { top: `${rect.bottom + POPUP_GAP}px` })
  }
}

function openMenu(): void {
  open.value = true
  activeIndex.value = props.options.findIndex((o) => o.value === props.modelValue)
  updatePosition()
}

function closeMenu(): void {
  open.value = false
  activeIndex.value = -1
}

function toggleMenu(): void {
  open.value ? closeMenu() : openMenu()
}

function select(value: string): void {
  if (value !== props.modelValue) emit('update:modelValue', value)
  closeMenu()
}

/** 循环移动高亮项，并把高亮项滚进可视区 */
function moveActive(step: number): void {
  const len = props.options.length
  if (len === 0) return
  const base = activeIndex.value < 0 ? (step > 0 ? -1 : 0) : activeIndex.value
  activeIndex.value = (base + step + len) % len
  nextTick(() => {
    listEl.value?.children[activeIndex.value]?.scrollIntoView({ block: 'nearest' })
  })
}

function onTriggerKeydown(e: KeyboardEvent): void {
  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      e.preventDefault()
      open.value ? moveActive(e.key === 'ArrowDown' ? 1 : -1) : openMenu()
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      if (open.value && activeIndex.value >= 0) select(props.options[activeIndex.value].value)
      else toggleMenu()
      break
    case 'Escape':
      // 只关下拉、不冒泡给外层弹窗（否则会顺带把设置弹窗关了）
      if (open.value) {
        e.stopPropagation()
        closeMenu()
      }
      break
    case 'Tab':
      closeMenu()
      break
  }
}

/** 点击组件外部关闭浮层（浮层已 Teleport 到 body，判定时要一并算作「内部」） */
function onDocumentPointerDown(e: PointerEvent): void {
  const target = e.target as Node
  if (rootEl.value?.contains(target) || listEl.value?.contains(target)) return
  closeMenu()
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('pointerdown', onDocumentPointerDown)
    // 触发器可能随弹窗滚动/窗口缩放移动，实时跟随
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
  } else {
    document.removeEventListener('pointerdown', onDocumentPointerDown)
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', updatePosition, true)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})
</script>

<template>
  <div ref="rootEl" class="select-menu">
    <button
      ref="triggerEl"
      class="select-menu__trigger"
      type="button"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggleMenu"
      @keydown="onTriggerKeydown"
    >
      <span v-if="selected?.icon" class="select-menu__icon">{{ selected.icon }}</span>
      <span class="select-menu__label">{{ selected?.label ?? '' }}</span>
      <ChevronIcon class="select-menu__chevron" :direction="open ? 'up' : 'down'" />
    </button>

    <Teleport to="body">
      <ul
        v-if="open"
        ref="listEl"
        class="select-menu__list"
        :class="{ 'select-menu__list--flipped': flipped }"
        :style="popupStyle"
        role="listbox"
      >
        <li
          v-for="(opt, i) in options"
          :key="opt.value"
          class="select-menu__option"
          :class="{
            'select-menu__option--active': i === activeIndex,
            'select-menu__option--selected': opt.value === modelValue
          }"
          role="option"
          :aria-selected="opt.value === modelValue"
          @click="select(opt.value)"
          @mouseenter="activeIndex = i"
        >
          <span v-if="opt.icon" class="select-menu__icon">{{ opt.icon }}</span>
          <span class="select-menu__label">{{ opt.label }}</span>
          <span v-if="opt.value === modelValue" class="select-menu__check">✓</span>
        </li>
      </ul>
    </Teleport>
  </div>
</template>

<style scoped lang="less">
.select-menu {
  position: relative;
  width: 100%;

  &__trigger {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: @color-surface;
    font-size: 13px;
    color: @color-text;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:hover {
      border-color: #b6bdc8;
    }

    &:focus-visible {
      border-color: @color-primary;
      box-shadow: 0 0 0 3px rgba(59, 124, 255, 0.15);
    }
  }

  &__icon {
    flex-shrink: 0;
    font-size: 16px;
    line-height: 1;
  }

  &__label {
    flex: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__chevron {
    flex-shrink: 0;
    color: @color-text-weak;
  }

  // 浮层 Teleport 到 body 后用 fixed 定位（top/left/width/max-height 由 JS 内联给出），
  // z-index 要高于设置弹窗遮罩的 2000，否则会被压在下面
  &__list {
    position: fixed;
    z-index: 2100;
    box-sizing: border-box;
    margin: 0;
    padding: 4px;
    overflow-y: auto;
    list-style: none;
    background: @color-surface;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    animation: selectMenuPop 0.12s ease;

    &--flipped {
      animation-name: selectMenuPopUp;
    }
  }

  &__option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 13px;
    color: @color-text;
    cursor: pointer;

    &--active {
      background: #f0f2f5;
    }

    &--selected {
      color: @color-primary;
      font-weight: 500;
    }
  }

  &__check {
    margin-left: auto;
    flex-shrink: 0;
    color: @color-primary;
  }
}

@keyframes selectMenuPop {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

// 向上翻转时动画方向相反
@keyframes selectMenuPopUp {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
