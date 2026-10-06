<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface CanvasInfo {
  id: string
  name: string
  updatedAt: number
}

const canvasList = ref<CanvasInfo[]>([])
const loading = ref(true)
const selectedId = ref<string | null>(null)

async function loadList(): Promise<void> {
  loading.value = true
  try {
    canvasList.value = await window.canvasApi.list()
    if (canvasList.value.length > 0 && !selectedId.value) {
      selectedId.value = canvasList.value[0].id
    }
  } catch (err) {
    console.warn('[picker] 加载画布列表失败：', err)
  } finally {
    loading.value = false
  }
}

function openCanvas(id: string): void {
  window.canvasApi.openNewWindow(id).finally(() => {
    // 成功或失败都关闭选择器窗口——如果 openNewWindow 失败，用户会看到新窗口的错误提示
    window.close()
  })
}

async function handleDoubleClick(e: MouseEvent): Promise<void> {
  e.preventDefault()
  if (selectedId.value) openCanvas(selectedId.value)
}

async function createAndOpen(): Promise<void> {
  const name = window.prompt('画布名称', '')
  if (!name || !name.trim()) return
  try {
    const result = await window.canvasApi.create(name.trim())
    window.canvasApi.openNewWindow(result.id).finally(() => window.close())
  } catch (err) {
    console.warn('[picker] 新建画布失败：', err)
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const y = new Date(now.getTime() - 86400000)
  const yesterday = d.toDateString() === y.toDateString()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (sameDay) return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (yesterday) return `昨天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

let unsubscribe: (() => void) | undefined
onMounted(() => {
  void loadList()
  // 全局监听 Enter 打开选中项
  window.addEventListener('keydown', onKeyDown)
  unsubscribe = window.canvasApi.onChanged(() => void loadList())
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  unsubscribe?.()
})

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && selectedId.value) {
    openCanvas(selectedId.value)
  }
}
</script>

<template>
  <div class="picker">
    <!-- 顶部：应用名 + 标题 -->
    <div class="picker__header">
      <div class="picker__logo">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect width="36" height="36" rx="8" fill="#007AFF" />
          <rect x="6" y="6" width="24" height="24" rx="3" stroke="white" stroke-width="1.5" fill="none" />
          <circle cx="14" cy="14" r="2" fill="white" />
          <circle cx="22" cy="14" r="2" fill="white" />
          <circle cx="14" cy="22" r="2" fill="white" />
          <circle cx="22" cy="22" r="2" fill="white" />
          <line x1="14" y1="14" x2="22" y2="14" stroke="white" stroke-width="1" opacity="0.6" />
          <line x1="14" y1="22" x2="22" y2="22" stroke="white" stroke-width="1" opacity="0.6" />
          <line x1="14" y1="14" x2="14" y2="22" stroke="white" stroke-width="1" opacity="0.6" />
          <line x1="22" y1="14" x2="22" y2="22" stroke="white" stroke-width="1" opacity="0.6" />
        </svg>
      </div>
      <h1 class="picker__title">选择画布</h1>
      <p class="picker__subtitle">Finder+</p>
    </div>

    <!-- 画布列表 -->
    <div class="picker__list-wrap" @dblclick="handleDoubleClick">
      <div v-if="loading" class="picker__loading">加载中…</div>
      <ul v-else-if="canvasList.length" class="picker__list">
        <li
          v-for="c in canvasList"
          :key="c.id"
          class="picker__item"
          :class="{ 'picker__item--active': c.id === selectedId }"
          @click="selectedId = c.id"
          @dblclick="openCanvas(c.id)"
        >
          <span class="picker__item-icon">📋</span>
          <div class="picker__item-info">
            <span class="picker__item-name">{{ c.name }}</span>
            <span class="picker__item-time">{{ formatTime(c.updatedAt) }}</span>
          </div>
          <span v-if="c.id === selectedId" class="picker__item-check">▶</span>
        </li>
      </ul>
      <div v-else class="picker__empty">暂无画布</div>
    </div>

    <!-- 底部按钮 -->
    <div class="picker__footer">
      <button class="picker__btn picker__btn--ghost" type="button" @click="createAndOpen">
        ＋ 新建画布
      </button>
      <button
        class="picker__btn picker__btn--primary"
        type="button"
        :disabled="!selectedId"
        @click="selectedId && openCanvas(selectedId)"
      >
        打开
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.picker {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 32px 40px 24px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1d1d1f;
  background: #ffffff;

  &__header {
    text-align: center;
    margin-bottom: 20px;
    flex-shrink: 0;
  }

  &__logo {
    margin-bottom: 10px;
  }

  &__title {
    font-size: 17px;
    font-weight: 600;
    margin: 0 0 2px;
  }

  &__subtitle {
    font-size: 12px;
    color: #86868b;
    margin: 0;
  }

  &__list-wrap {
    flex: 1;
    min-height: 0;
    background: #f5f5f7;
    border-radius: 10px;
    padding: 8px;
    overflow-y: auto;
  }

  &__loading,
  &__empty {
    text-align: center;
    padding: 32px;
    color: #86868b;
    font-size: 13px;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
      background: rgba(0, 122, 255, 0.08);
    }

    &--active {
      background: #007aff;
      color: #ffffff;

      .picker__item-time {
        color: rgba(255, 255, 255, 0.75);
      }

      &:hover {
        background: #0a74e6;
      }
    }
  }

  &__item-icon {
    font-size: 20px;
    width: 28px;
    text-align: center;
  }

  &__item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__item-name {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-time {
    font-size: 11px;
    color: #86868b;
  }

  &__item-check {
    font-size: 12px;
    opacity: 0.9;
  }

  &__footer {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    gap: 8px;
  }

  &__btn {
    font-size: 13px;
    padding: 7px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  &__btn--ghost {
    background: transparent;
    color: #007aff;

    &:hover {
      background: rgba(0, 122, 255, 0.08);
    }
  }

  &__btn--primary {
    background: #007aff;
    color: #ffffff;

    &:hover:not(:disabled) {
      background: #0a74e6;
    }

    &:disabled {
      background: #c7c7cc;
      cursor: not-allowed;
    }
  }
}
</style>
