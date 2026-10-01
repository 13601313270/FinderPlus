<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useGlobalSettings } from '@renderer/composables/useGlobalSettings'

/**
 * 全局设置弹窗（机制版）：
 * - 自带弹窗壳（Teleport + mask + dialog + header + body + Esc 关闭）
 * - 状态来自 useGlobalSettings（module 级单例），工具栏按钮和系统应用菜单共享
 * - 具体设置项后续往 body 里加，现在先放占位内容
 */
const { visible, openSettings, closeSettings } = useGlobalSettings()

/** 系统应用菜单「设置…」触发的取消订阅句柄 */
let disposeMenuListener: (() => void) | undefined

function onMaskClick(): void {
  closeSettings()
}

function onDialogClick(e: MouseEvent): void {
  e.stopPropagation()
}

function onKeyDown(e: KeyboardEvent): void {
  if (visible.value && e.key === 'Escape') closeSettings()
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  // 系统应用菜单（macOS 顶部菜单栏「设置…」）触发的入口 → 打开同一个弹窗
  disposeMenuListener = window.appMenuApi?.onOpenSettings(openSettings)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  disposeMenuListener?.()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="gs-mask" @click="onMaskClick">
      <div class="gs-dialog" @click="onDialogClick">
        <div class="gs-dialog__header">
          <h3 class="gs-dialog__title">设置</h3>
          <button
            class="gs-dialog__close"
            type="button"
            title="关闭（Esc）"
            @click="closeSettings"
          >×</button>
        </div>

        <div class="gs-dialog__body">
          <!-- 设置分区：后续每类全局设置在这里加一块 -->
          <p class="gs-placeholder">暂无可配置的全局设置</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.gs-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: gsFadeIn 0.15s ease;
}

.gs-dialog {
  width: 520px;
  max-height: 80vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: gsPopIn 0.18s ease;
  overflow: hidden;
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
    padding: 16px 20px;
  }
}

.gs-placeholder {
  margin: 0;
  padding: 32px 0;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
}

@keyframes gsFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes gsPopIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>