<script setup lang="ts">
import { computed, ref, watch, type Ref, onUnmounted, reactive } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { useNodePosition, manualBeginDrag } from '@renderer/composables/useNodePosition'
import { setLastDragPaths } from '@renderer/composables/useFileDragOut'
import { viewport } from '@renderer/canvas/viewport'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { AudioFileNode } from '../AudioFileNode/node'
import { AudioFolderNode } from './node'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import AudioFolderHelpDialog from './AudioFolderHelpDialog.vue'

// 卡片头部标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(AudioFolderNode.TYPE)

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof AudioFolderNode ? n : undefined
})

// 音频文件夹自身是顶级节点：position 即世界坐标，拖动用 startDrag。
// 子节点不再用 NodeShell 自由摆放——它们以统一尺寸的列表行展示。
const { box, startDrag } = useNodePosition(() => node.value)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

// —— 已收养的子节点 / 当前选中项：订阅 node.onChanged 刷新 ——
const children: Ref<AudioFileNode[]> = ref([])
const selectedId = ref('')
let unsubscribe: (() => void) | undefined

// 记录哪些子节点的播放器状态有订阅
const playerSubs = new Map<string, () => void>()

function sync(): void {
  const n = node.value
  children.value = n ? [...n.children].filter((c): c is AudioFileNode => c instanceof AudioFileNode) : []
  selectedId.value = n?.selectedChildId ?? ''
  refreshContent()
}

watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(sync)
    sync()
  },
  { immediate: true, flush: 'sync' }
)

/** 选中音频文件名，用于右下角提示文案 */
const selectedName = computed(() => {
  const child = children.value.find((c) => c.id === selectedId.value)
  return child?.fileName ?? ''
})

/** 某子节点是否正在播放 */
const playingId = ref('')

/** 每个子节点的时长（秒）。初始值 0——AudioFileNode 异步解码完成后会通过 subscribePlayer 通知并写入真实值 */
const durations = reactive(new Map<string, number>())

/** 每个子节点的播放进度（0~1）。ended / pause 时清零，play + timeupdate 时实时推进 */
const progress = reactive(new Map<string, number>())

/** 格式化秒数 → "mm:ss" 或 "h:mm:ss" */
function formatDuration(sec: number): string {
  if (!sec || sec <= 0 || !isFinite(sec)) return '--:--'
  const total = Math.round(sec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 为单个子节点确保播放器状态订阅。
 * 注意：不要订阅 child.onChanged 再去调 reloadFileContent！
 * AudioFileNode（及 FileNode 基类）自己处理文件替换 → 自动 setContent → notifyChanged。
 * render.vue 如果在 child.onChanged 上再回调 reloadFileContent，会形成：
 *   setContent → notifyChanged → childContentSubs 回调 → reloadFileContent → setContent → 无限循环。
 */
function ensureChild(child: AudioFileNode): void {
  if (!child.fileName) return

  // 播放器状态订阅：AudioFileNode 内部 Audio 的 play/pause/ended / 时长解码完成 / timeupdate 都通知这里
  // 这里同时负责：写 duration（异步解码）、写 progress（实时播放进度）、维护 playingId
  if (!playerSubs.has(child.id)) {
    playerSubs.set(child.id, child.subscribePlayer(() => {
      const snap = child.snapshot()
      // 播放状态
      if (snap.isPlaying) {
        playingId.value = child.id
      } else if (playingId.value === child.id) {
        playingId.value = ''
      }
      // 时长：每次 notifyPlayerChanged 都会带最新 duration（含刚解码完的那次）
      if (snap.duration > 0) {
        durations.set(child.id, snap.duration)
      }
      // 进度：currentTime 持续推进；不在播放时清零（pause/ended 都会进来）
      if (snap.isPlaying && snap.duration > 0) {
        progress.set(child.id, Math.min(1, Math.max(0, snap.currentTime / snap.duration)))
      } else if (progress.has(child.id)) {
        progress.set(child.id, 0)
      }
    }))
  }
}

/** 同步子节点集合：清理已移出的订阅、补齐新增的 */
function refreshContent(): void {
  const ids = new Set(children.value.map((c) => c.id))

  // 清理已移除子节点的订阅和缓存
  for (const [id, unsub] of [...playerSubs.entries()]) {
    if (!ids.has(id)) {
      unsub()
      playerSubs.delete(id)
      durations.delete(id)
      progress.delete(id)
      if (playingId.value === id) playingId.value = ''
    }
  }

  for (const child of children.value) {
    ensureChild(child)
  }
}

function releaseAll(): void {
  playerSubs.forEach((unsub) => unsub())
  playerSubs.clear()
  durations.clear()
  progress.clear()
  playingId.value = ''
}

// —— 播放/暂停单个音频 ——
// 策略：任何时刻只允许一个子节点处于播放状态。
// 点击某个子节点的播放按钮时，先暂停当前正在播放的（如果是不同的那个），再 toggle 目标。
// 点击正在播放的那个 → 它自己 pause（playingId 通过 Audio 的 pause 事件自动清空）。
function onTogglePlay(child: AudioFileNode): void {
  const currentId = playingId.value
  if (currentId && currentId !== child.id) {
    // 另一个在播放 → 先暂停它
    const prev = children.value.find((c) => c.id === currentId)
    prev?.togglePlay() // AudioFileNode.togglePlay 内部调 audio.pause()
  }
  child.togglePlay()
}

/** 某个子节点是否正在被拖拽（视觉高亮用） */
const draggingId = ref('')

// —— 行级拖拽 + 选中：pointerdown 先选中，再启动 manualBeginDrag 让 App 层结算 ——
// manualBeginDrag 内部：设 draggingNode / 实时 setPosition → 松手 App 判定是否越出 container → removeChild 释放回画布
function onRowPointerDown(e: PointerEvent, child: AudioFileNode): void {
  node.value?.selectChild(child.id)
  draggingId.value = child.id
  manualBeginDrag(child, e)
  // manualBeginDrag 内部自己加了 pointeronce 的 pointerup 监听；
  // 但需要额外清除 draggingId——在 window 级 pointerup 上做（once 够了）
  const cleanup = () => {
    draggingId.value = ''
    window.removeEventListener('pointerup', cleanup)
  }
  window.addEventListener('pointerup', cleanup, { once: true })
}

// —— 双击文件名：用系统默认程序打开 ——
function onDblClick(child: AudioFileNode): void {
  if (child.fileName) {
    // @ts-ignore
    window.fileApi?.openInSystem?.(child.fileName)
  }
}

// —— 批量 OS 级拖出：取所有子节点的 fileName，一次 startDrag 全拖走 ——
function onBatchDragOutPointerDown(e: PointerEvent): void {
  e.stopPropagation()
  e.preventDefault()
  const names = children.value.filter((c) => c.fileName).map((c) => c.fileName!)
  if (names.length === 0) return
  // @ts-ignore
  window.fileApi.startDrag(names).then((paths: string[]) => {
    setLastDragPaths(paths)
  })
}

// —— 东南角 resize：拖手柄 → setBox（AudioFolderNode 继承 FolderNode 的最小框钳制） ——
let resizing = false
let startClientX = 0
let startClientY = 0
let startBox: [number, number] = [0, 0]

function startResize(e: PointerEvent): void {
  e.preventDefault()
  e.stopPropagation()
  resizing = true
  startClientX = e.clientX
  startClientY = e.clientY
  startBox = [box.value[0], box.value[1]]
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', onResizeEnd)
}

function onResizeMove(e: PointerEvent): void {
  if (!resizing || !node.value) return
  const scale = viewport.scale || 1
  const w = startBox[0] + (e.clientX - startClientX) / scale
  const h = startBox[1] + (e.clientY - startClientY) / scale
  node.value.setBox(w, h)
}

function onResizeEnd(): void {
  resizing = false
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', onResizeEnd)
}

onUnmounted(() => {
  unsubscribe?.()
  releaseAll()
  onResizeEnd()
})
</script>

<template>
  <div class="audio-folder">
    <!-- 顶部横栏：拖动整个文件夹的唯一手柄 -->
    <div class="audio-folder__bar" @pointerdown="startDrag">
      <span class="audio-folder__bar__text">{{ nodeTitle }}</span>
      <button
        class="audio-folder__help"
        type="button"
        :title="t('helpTitle')"
        @pointerdown.stop
        @click.stop="showHelp = true"
      >?</button>
    </div>

    <!-- 内容区：音频列表（超出滚动） -->
    <div class="audio-folder__list">
      <div
        v-for="c in children"
        :key="c.id"
        class="audio-folder__row"
        :class="{
          'audio-folder__row--selected': c.id === selectedId,
          'audio-folder__row--dragging': c.id === draggingId
        }"
        :style="{ '--progress': progress.get(c.id) ?? 0 }"
        @pointerdown.stop="onRowPointerDown($event, c)"
        @dblclick.stop="onDblClick(c)"
      >
        <!-- 播放/暂停按钮 -->
        <button
          class="audio-folder__play-btn"
          type="button"
          :title="playingId === c.id ? '暂停' : '播放'"
          @pointerdown.stop
          @click.stop="onTogglePlay(c)"
        >
          <!-- 播放图标（三角） / 暂停图标（双竖线） -->
          <svg v-if="playingId !== c.id" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
          </svg>
        </button>

        <!-- 文件名 -->
        <span class="audio-folder__name" :title="c.fileName">{{ c.fileName }}</span>

        <!-- 时长 -->
        <span class="audio-folder__duration">{{ formatDuration(durations.get(c.id) ?? 0) }}</span>

        <!-- 格式标签 -->
        <span class="audio-folder__format">{{ c.displayFormat }}</span>
      </div>

      <!-- 空状态 -->
      <div v-if="children.length === 0" class="audio-folder__empty">
        {{ t('audioCount', { n: 0 }) }}
      </div>
    </div>

    <span class="audio-folder__hint">
      {{ t('audioCount', { n: children.length }) }}<template v-if="selectedName"> · {{ t('selected', { name: selectedName }) }}</template>
    </span>

    <!-- 左下角批量拖出图标：唤醒 OS 级拖拽所有子文件 -->
    <button
      v-if="children.length > 0"
      class="audio-folder__drag-all"
      type="button"
      title="批量拖出所有音频"
      @pointerdown.stop.prevent="onBatchDragOutPointerDown"
      @click.stop
    >
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
        <path d="M3 3h6l4 4v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.2" />
        <path d="M9 3v4h4" stroke="currentColor" stroke-width="1.2" />
      </svg>
    </button>

    <!-- 东南角 resize 手柄 -->
    <div class="audio-folder__resize" @pointerdown.stop="startResize" :title="t('resizeHint')" />
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <AudioFolderHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.audio-folder {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;

  &__bar {
    flex: 0 0 22px;
    display: flex;
    align-items: center;
    padding-left: 10px;
    padding-right: 8px;
    z-index: 2;
    cursor: grab;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e7eb;
    border-radius: @radius-md @radius-md 0 0;

    &:active {
      cursor: grabbing;
    }
  }

  &__bar__text {
    font-size: 12px;
    font-weight: 600;
    color: @color-text;
  }

  // 帮助按钮沿用 code 节点的灰底圆问号外观
  &__help {
    all: unset;
    margin-left: auto;
    flex-shrink: 0;
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

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }

  // 音频列表：纵向滚动，每行等高大间距
  &__list {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: 8px 0 22px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-content: start;
  }

  // 每行：播放按钮 + 文件名 + 时长 + 格式标签
  // 进度条用 background-image 双层叠画：
  //   第一层（上面）：进度条蓝色，从左侧起算，宽度 = calc(var(--progress) * 100%)
  //   第二层（下面）：底色（默认/hover/selected 各自不同），全铺
  &__row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    margin: 0 6px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.1s;
    position: relative;

    background-image: linear-gradient(rgba(59, 124, 255, 0.08), rgba(59, 124, 255, 0.08));
    background-size: calc(var(--progress, 0) * 100%) 100%;
    background-repeat: no-repeat;
    background-color: transparent;

    &:hover {
      background-image:
        linear-gradient(rgba(59, 124, 255, 0.12), rgba(59, 124, 255, 0.12)),
        linear-gradient(#f2f3f5, #f2f3f5);
      background-size: calc(var(--progress, 0) * 100%) 100%, 100% 100%;
      background-repeat: no-repeat, no-repeat;
    }

    &--selected {
      background-image:
        linear-gradient(rgba(59, 124, 255, 0.18), rgba(59, 124, 255, 0.18)),
        linear-gradient(rgba(59, 124, 255, 0.1), rgba(59, 124, 255, 0.1));
      background-size: calc(var(--progress, 0) * 100%) 100%, 100% 100%;
      background-repeat: no-repeat, no-repeat;
      border: 1px solid @color-primary;
      padding: 4px 9px; // 补偿 border
    }

    // 拖拽中视觉：抬起感（阴影 + 微透明 + 抓手变 grab）
    &--dragging {
      cursor: grabbing;
      opacity: 0.85;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
    }
  }

  &__play-btn {
    all: unset;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(74, 124, 255, 0.1);
    color: #3b7cff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: rgba(74, 124, 255, 0.25);
    }

    &:active {
      background: rgba(74, 124, 255, 0.4);
    }
  }

  &__name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 12px;
    color: @color-text;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__duration {
    flex-shrink: 0;
    font-size: 11px;
    color: @color-text-weak;
    font-variant-numeric: tabular-nums; // 等宽数字，mm:ss 切换时不抖动
  }

  &__format {
    flex-shrink: 0;
    font-size: 10px;
    color: @color-text-weak;
    background: #f3f4f6;
    padding: 1px 6px;
    border-radius: 3px;
  }

  &__empty {
    padding: 20px;
    text-align: center;
    font-size: 12px;
    color: @color-text-weak;
  }

  &__hint {
    position: absolute;
    right: 10px;
    bottom: 6px;
    max-width: calc(100% - 20px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    color: @color-text-weak;
    pointer-events: none;
    z-index: 1;
  }

  &__resize {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, #b0b7c3 50%);
    z-index: 2;
  }

  // 左下角批量拖出图标
  &__drag-all {
    position: absolute;
    left: 6px;
    bottom: 6px;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: none;
    background: rgba(74, 124, 255, 0.9);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    padding: 0;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 2;

    .audio-folder:hover & {
      opacity: 1;
    }

    &:active {
      cursor: grabbing;
    }
  }
}
</style>
