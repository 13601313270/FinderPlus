<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { RectDecor } from '@renderer/canvas/decor'
import { removeDecor, decorChanged } from '@renderer/canvas/decor'

/**
 * 矩形装饰元素设置弹窗：
 * - 背景色（颜色选择器 + 快速清除）
 * - 左上角标题（输入框 + 颜色）
 * - 删除按钮（危险操作，直接删）
 *
 * 直接修改 props.decor 的属性（reactive 对象），改了立即生效，无中间草稿。
 */

const props = defineProps<{
  decor: RectDecor | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

/** 弹窗显隐 */
const visible = ref(false)

/**
 * 打开弹窗。不做 props.decor 防御检查——
 * 调用方（DecorLayer）先同步设 editingDecor，再立刻调 open()，
 * 但 Vue 的 props 更新是异步的，此时读 props.decor 还是旧值（null），
 * 检查会误拦截。模板层已有 v-if="visible && decor" 守卫，
 * decor 为 null 时弹窗内容不会渲染，安全。
 */
function open(): void {
  visible.value = true
}

function close(): void {
  visible.value = false
  emit('close')
}

function handleDelete(): void {
  if (!props.decor) return
  removeDecor(props.decor.id)
  close()
}

function clearFill(): void {
  if (props.decor) {
    props.decor.fill = ''
  }
}

function handleMaskClick(e: MouseEvent): void {
  const target = e.target as HTMLElement
  if (target.classList.contains('rdd-mask')) {
    close()
  }
}

// ESC 关闭
function onKeydown(e: KeyboardEvent): void {
  if (!visible.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/**
 * 监听 props.decor 所有属性变化（背景色、标题等）→ 触发持久化。
 * deep: true 才能追到 fill/title 这些嵌套属性的变化。
 * 弹窗打开时 decor 从 null 变成对象用 immediate: true 也要跳过——那是初始化，不是用户改值。
 */
watch(
  () => props.decor,
  (d, prev) => {
    if (d && prev) decorChanged(d)
  },
  { deep: true }
)

defineExpose({ open, close })
</script>

<template>
  <Teleport to="body">
    <Transition name="rdd-fade">
      <div v-if="visible && decor" class="rdd-mask" @click="handleMaskClick">
        <div class="rdd-dialog" role="dialog" aria-modal="true" @click.stop>
          <h3 class="rdd-title">矩形设置</h3>

          <!-- 背景色 -->
          <div class="rdd-field">
            <label class="rdd-label">背景色</label>
            <div class="rdd-color-row">
              <input
                type="color"
                class="rdd-color-picker"
                :value="decor.fill || '#ffffff'"
                @input="(e) => decor && (decor.fill = (e.target as HTMLInputElement).value)"
              />
              <input
                type="text"
                class="rdd-color-text"
                :value="decor.fill"
                @input="(e) => decor && (decor.fill = (e.target as HTMLInputElement).value)"
                placeholder="#ffffff 或留空透明"
              />
              <button
                v-if="decor.fill"
                class="rdd-ghost-btn"
                type="button"
                @click="clearFill"
                title="清除背景色"
              >×</button>
            </div>
          </div>

          <!-- 左上角标题 -->
          <div class="rdd-field">
            <label class="rdd-label">左上角标题</label>
            <input
              type="text"
              class="rdd-input"
              :value="decor.title"
              @input="(e) => decor && (decor.title = (e.target as HTMLInputElement).value)"
              placeholder="留空不显示"
              maxlength="40"
            />
          </div>

          <!-- 标题颜色 -->
          <div class="rdd-field">
            <label class="rdd-label">标题颜色</label>
            <div class="rdd-color-row">
              <input
                type="color"
                class="rdd-color-picker"
                :value="decor.titleColor"
                @input="(e) => decor && (decor.titleColor = (e.target as HTMLInputElement).value)"
              />
              <input
                type="text"
                class="rdd-color-text"
                :value="decor.titleColor"
                @input="(e) => decor && (decor.titleColor = (e.target as HTMLInputElement).value)"
                placeholder="#6b7280"
              />
            </div>
          </div>

          <!-- 底部操作区 -->
          <div class="rdd-footer">
            <button
              class="rdd-danger-btn"
              type="button"
              @click="handleDelete"
            >删除</button>
            <div class="rdd-spacer" />
            <button
              class="rdd-ghost-btn"
              type="button"
              @click="close"
            >完成</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="less">
.rdd-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(17, 24, 39, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rdd-dialog {
  min-width: 320px;
  max-width: 400px;
  padding: 20px 22px 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
}

.rdd-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.rdd-field {
  margin-bottom: 14px;
}

.rdd-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.rdd-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 11px;
  font-size: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: @color-primary;
    box-shadow: 0 0 0 3px rgba(59, 124, 255, 0.15);
  }
}

.rdd-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rdd-color-picker {
  width: 32px;
  height: 28px;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  background: #fff;
  flex-shrink: 0;

  &::-webkit-color-swatch-wrapper { padding: 2px; }
  &::-webkit-color-swatch { border: none; border-radius: 3px; }
}

.rdd-color-text {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  font-size: 12px;
  font-family: Menlo, Consolas, monospace;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  outline: none;

  &:focus {
    border-color: @color-primary;
    box-shadow: 0 0 0 2px rgba(59, 124, 255, 0.15);
  }
}

.rdd-ghost-btn {
  all: unset;
  cursor: pointer;
  padding: 6px 14px;
  font-size: 13px;
  color: #6b7280;
  border-radius: 6px;
  transition: background 0.12s ease, color 0.12s ease;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
}

.rdd-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.rdd-spacer {
  flex: 1;
}

.rdd-danger-btn {
  all: unset;
  cursor: pointer;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #d94b4b;
  border-radius: 6px;
  transition: background 0.12s ease;

  &:hover {
    background: #fff5f5;
  }
}

.rdd-fade-enter-active,
.rdd-fade-leave-active {
  transition: opacity 0.15s ease;
}
.rdd-fade-enter-from,
.rdd-fade-leave-to {
  opacity: 0;
}
</style>
