<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useHelpCenter } from '@renderer/composables/useHelpCenter'

/**
 * 全局帮助中心：左侧列出所有注册了 help 的节点，右侧动态加载对应帮助组件。
 *
 * 自带弹窗壳（mask + dialog + header + body + Esc 监听），
 * 不依赖 HelpDialog 通用组件——后续帮助中心可能需要和节点级帮助不同的定制化外观
 * （比如更大的宽度、侧边栏布局、不同的遮罩/动画/关闭方式）。
 *
 * 状态全部来自 useHelpCenter composable（module 级单例），任何地方都能触发。
 */
const { visible, loading, currentComp, currentType, helpGroups, closeCenter, selectTopic } = useHelpCenter()

/** 扁平化的所有 topic，自动选中时取第一个 */
const allTopics = computed(() => helpGroups.flatMap((g) => g.items))

function onMaskClick(): void {
  closeCenter()
}

function onDialogClick(e: MouseEvent): void {
  e.stopPropagation()
}

function onKeyDown(e: KeyboardEvent): void {
  if (visible.value && e.key === 'Escape') closeCenter()
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})

// 如果打开时还没选过 topic，自动选第一个
watch(visible, (v) => {
  if (v && !currentComp.value && allTopics.value.length > 0) {
    void selectTopic(allTopics.value[0])
  }
})

// 当前激活的 topic（用 type 比对，避免对象引用问题）
const activeType = computed(() => currentType.value)
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="hc-mask" @click="onMaskClick">
      <div class="hc-dialog" @click="onDialogClick">
        <div class="hc-dialog__header">
          <h3 class="hc-dialog__title">帮助中心</h3>
          <button
            class="hc-dialog__close"
            type="button"
            title="关闭（Esc）"
            @click="closeCenter"
          >×</button>
        </div>
        <div class="hc-dialog__body">
          <aside class="hc-sidebar">
            <template v-for="(group, gi) in helpGroups" :key="gi">
              <div v-if="group.title" class="hc-sidebar__group-title">{{ group.title }}</div>
              <ul class="hc-sidebar__list">
                <li
                  v-for="topic in group.items"
                  :key="topic.type"
                  class="hc-sidebar__item"
                  :class="{ 'hc-sidebar__item--active': topic.type === activeType }"
                  @click="selectTopic(topic)"
                >
                  {{ topic.label }}
                </li>
              </ul>
            </template>
            <p v-if="allTopics.length === 0" class="hc-sidebar__empty">
              暂无可查看的帮助文档
            </p>
          </aside>

          <main class="hc-content">
            <div v-if="loading" class="hc-content__loading">加载中…</div>
            <div v-else-if="currentComp" class="hc-content__dynamic">
              <component :is="currentComp" />
            </div>
            <div v-else class="hc-content__loading hc-content__loading--empty">
              请从左侧选择一个节点
            </div>
          </main>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.hc-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: hcFadeIn 0.15s ease;
}

.hc-dialog {
  width: 720px;   // 帮助中心比节点级帮助宽一些，容纳侧边栏
  height: 520px;
  max-height: 85vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: hcPopIn 0.18s ease;
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
    display: flex;
    overflow: hidden;
  }
}

/* 侧边栏 */
.hc-sidebar {
  width: 140px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  padding: 14px 0;
  background: #fafbfc;
  overflow-y: auto;

  &__group-title {
    padding: 14px 14px 4px;
    font-size: 10px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__item {
    padding: 7px 14px;
    font-size: 12px;
    color: #4b5563;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    border-left: 2px solid transparent;

    &:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    &--active {
      background: #eff6ff;
      color: #2563eb;
      border-left-color: #2563eb;
      font-weight: 500;
    }
  }

  &__empty {
    padding: 14px;
    font-size: 11px;
    color: #9ca3af;
    margin: 0;
  }
}

/* 右侧动态内容 */
.hc-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  min-width: 0;

  &__loading {
    padding: 32px;
    text-align: center;
    font-size: 12px;
    color: #9ca3af;

    &--empty {
      padding-top: 48px;
    }
  }

  &__dynamic {
    min-height: 100%;
  }
}

@keyframes hcFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes hcPopIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
