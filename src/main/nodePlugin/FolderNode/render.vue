<script setup lang="ts">
import { computed, ref, watch, type Ref, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import type { Node } from '../../engine/node/Node'
import { manifestFor } from '../index'
import NodeShell from '@renderer/components/NodeShell.vue'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { viewport } from '@renderer/canvas/viewport'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import { FolderNode } from './node'
import { messages } from './i18n'
import FolderHelpDialog from './FolderHelpDialog.vue'

// 卡片头部标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(FolderNode.TYPE)

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof FolderNode ? n : undefined
})

// —— 文件夹自身 box/拖动：size 用 box（resize 拖手柄），拖动用 startDrag ——
// 注意：文件夹自身是顶级节点，position 即世界坐标；子节点需由本 render 嵌套渲染，
// 其 position 已是相对本文件夹的局部坐标，直接渲染即可——DOM 嵌套自动累加世界坐标，
// 无需任何负向偏移（文件夹套文件夹也只是层层嵌套，不会越加越多）。
const { box, startDrag } = useNodePosition(() => node.value)

// —— 已收养的子节点列表：订阅 folder.onChanged 刷新 ——
const children: Ref<Node[]> = ref([])
let unsubscribe: (() => void) | undefined

function sync(): void {
  const n = node.value
  children.value = n ? [...n.children] : []
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

// 嵌套子外壳：直接渲染子节点局部坐标（NodeShell 会以自身 position 定位），
// 浏览器沿本文件夹 DOM 逐级累加，自动得到正确的世界坐标——不再传负向偏移。

// —— 东南角 resize：拖手柄 → setBox（FolderNode override 会钳制到 MIN_W/MIN_H） ——
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
  onResizeEnd()
})
</script>

<template>
  <div class="folder">
    <!-- 顶部横栏：文件夹「拖动整个文件夹」的唯一手柄。
         不再把 startDrag 绑在整个 .folder 上——那样点在子节点上会冒泡同时拖起文件夹和子节点。 -->
    <div class="folder__bar" @pointerdown="startDrag">
      <span class="folder__bar__text">{{ nodeTitle }}</span>
      <button
        class="folder__help"
        type="button"
        :title="t('helpTitle')"
        @pointerdown.stop
        @click.stop="showHelp = true"
      >?</button>
    </div>

    <!-- 内容区底色：子节点渲染在此之上（嵌套 NodeShell，相对坐标 → 世界坐标正确） -->
    <div class="folder__surface" />

    <!-- 已收养的子节点：以相对坐标渲染进文件夹 DOM；端口/边/小地图按子节点世界坐标测量正确 -->
    <NodeShell
      v-for="c in children"
      :key="c.id"
      :node="c"
      :render="manifestFor(c)?.render"
    />

    <span class="folder__hint">{{ t('fileCount', { n: children.length }) }}</span>

    <!-- 东南角 resize 手柄 -->
    <div class="folder__resize" @pointerdown.stop="startResize" :title="t('resizeHint')" />
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <FolderHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.folder {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: visible;
  background: #ffffff;
  border: 1px solid @node-border-color;
  border-radius: 10px;

  // 注意：不要把 grab 光标/startDrag 放这里——整体可拖会让「点子节点」也拖起文件夹

  &__bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 22px;
    display: flex;
    align-items: center;
    padding-left: 10px;
    padding-right: 8px;
    z-index: 2;
    cursor: grab;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e7eb;
    border-radius: 10px 10px 0 0;

    &:active {
      cursor: grabbing;
    }
  }

  &__bar__text {
    font-size: 12px;
    font-weight: 600;
    color: #1f2329;
  }

  // 帮助按钮沿用其余节点的灰底圆问号外观（margin-left:auto 推到横栏最右）
  &__help {
    all: unset;
    cursor: pointer;
    margin-left: auto;
    flex-shrink: 0;
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

  &__surface {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  &__hint {
    position: absolute;
    right: 10px;
    bottom: 8px;
    font-size: 11px;
    color: #7a8cff;
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
    background: linear-gradient(135deg, transparent 50%, #4a7cff 50%);
    z-index: 2;
  }
}
</style>