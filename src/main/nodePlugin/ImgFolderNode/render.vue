<script setup lang="ts">
import { computed, ref, watch, type Ref, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import type { Node } from '../../engine/node/Node'
import { base64ToBlob } from '../../engine/data/base64'
import ImgThumbCell from '@renderer/components/ImgThumbCell.vue'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { viewport } from '@renderer/canvas/viewport'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { ImgFileNode } from '../ImgFileNode/node'
import { inferImageMime } from '../ImgFileNode/mime'
import { ImgFolderNode } from './node'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import ImgFolderHelpDialog from './ImgFolderHelpDialog.vue'

// 卡片头部标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(ImgFolderNode.TYPE)

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ImgFolderNode ? n : undefined
})

// 图片文件夹自身是顶级节点：position 即世界坐标，拖动用 startDrag。
// 子节点不再用 NodeShell 自由摆放——它们以统一尺寸的缩略图网格展示（见下方 thumbs）。
const { box, startDrag } = useNodePosition(() => node.value)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

// —— 已收养的子节点 / 当前选中项：订阅 node.onChanged 刷新 ——
const children: Ref<Node[]> = ref([])
const selectedId = ref('')
let unsubscribe: (() => void) | undefined

function sync(): void {
  const n = node.value
  children.value = n ? [...n.children] : []
  selectedId.value = n?.selectedChildId ?? ''
  refreshThumbs(children.value)
}

// —— 缩略图：nodeId → objectURL。子节点不再挂载自身 render.vue，
//    所以这里读一次二进制，既产出缩略图，也调 setContent 让子节点产出 ImgFileValue
//    （输出端口 commitSelected 依赖它）。
//    必须声明在下面的 watch 之前——immediate watch 会在 setup 阶段同步执行到 sync()，
//    那时这些 const 若还在 TDZ 里就会抛 "Cannot access before initialization"。 ——
const thumbs = ref<Record<string, string>>({})
const thumbUrlByNode = new Map<string, string>() // nodeId → objectURL（卸载时 revoke）
const thumbSourceByNode = new Map<string, string>() // nodeId → 已生成缩略图的 fileName
const childUnsubs = new Map<string, () => void>() // nodeId → 子节点 onChanged 退订

watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(sync)
    sync()
  },
  { immediate: true, flush: 'sync' }
)

function nameOf(child: Node): string {
  return child instanceof ImgFileNode ? child.fileName : ''
}

/** 选中图片文件名，用于右下角提示文案 */
const selectedName = computed(() => {
  const child = children.value.find((c) => c.id === selectedId.value)
  return child ? nameOf(child) : ''
})

/** 为单个子节点按当前 fileName 生成缩略图；fileName 未变则跳过 */
async function ensureThumb(child: ImgFileNode): Promise<void> {
  const name = child.fileName
  if (!name) return
  if (thumbSourceByNode.get(child.id) === name && thumbUrlByNode.has(child.id)) return
  try {
    const b64 = await window.fileApi.readBinary(name)
    if (child.fileName !== name) return // 等待期间文件被替换，丢弃过期结果
    const url = URL.createObjectURL(base64ToBlob(b64, inferImageMime(name)))
    releaseThumbUrl(child.id)
    thumbUrlByNode.set(child.id, url)
    thumbSourceByNode.set(child.id, name)
    thumbs.value = { ...thumbs.value, [child.id]: url }
    // 放在最后：setContent 会触发子节点 notifyChanged → 重入本函数，
    // 此时上面的标记已就位，重入会直接跳过，不会重复读盘
    child.setContent(b64) // 让子节点也产出一份 ImgFileValue（输出端口依赖它）
  } catch {
    // 文件可能已被用户删了，静默忽略
  }
}

/** 只回收 objectURL（保留订阅），供内容替换时重建缩略图 */
function releaseThumbUrl(id: string): void {
  const url = thumbUrlByNode.get(id)
  if (url) URL.revokeObjectURL(url)
  thumbUrlByNode.delete(id)
  thumbSourceByNode.delete(id)
  if (thumbs.value[id]) {
    const next = { ...thumbs.value }
    delete next[id]
    thumbs.value = next
  }
}

/** 彻底清理一个子节点的缩略图与订阅（子节点被移出时） */
function dropChild(id: string): void {
  releaseThumbUrl(id)
  childUnsubs.get(id)?.()
  childUnsubs.delete(id)
}

/** 同步缩略图集合：清理已移出的、订阅新增的、补齐缺失的 */
function refreshThumbs(list: readonly Node[]): void {
  const ids = new Set(list.map((c) => c.id))
  const known = new Set([...thumbUrlByNode.keys(), ...childUnsubs.keys()])
  for (const id of known) {
    if (!ids.has(id)) dropChild(id)
  }
  for (const child of list) {
    if (!(child instanceof ImgFileNode)) continue
    if (!childUnsubs.has(child.id)) {
      // 文件被替换（同名也走 fileRevision 变化 → notifyChanged）时重建缩略图
      childUnsubs.set(child.id, child.onChanged(() => void ensureThumb(child)))
    }
    void ensureThumb(child)
  }
}

function releaseAllThumbs(): void {
  for (const id of [...thumbUrlByNode.keys(), ...childUnsubs.keys()]) dropChild(id)
  thumbs.value = {}
}

// —— 东南角 resize：拖手柄 → setBox（ImgFolderNode 继承 FolderNode 的最小框钳制） ——
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
  releaseAllThumbs()
  onResizeEnd()
})
</script>

<template>
  <div class="img-folder">
    <!-- 顶部横栏：拖动整个文件夹的唯一手柄 -->
    <div class="img-folder__bar" @pointerdown="startDrag">
      <span class="img-folder__bar__text">{{ nodeTitle }}</span>
      <button
        class="img-folder__help"
        type="button"
        :title="t('helpTitle')"
        @pointerdown.stop
        @click.stop="showHelp = true"
      >?</button>
    </div>

    <!-- 内容区：统一尺寸的缩略图网格（超出滚动）。点一格即切换选中；
         传 node / containerWorld 后每格还能右键弹出该图片节点的菜单、拖动拖出文件夹回画布 -->
    <div class="img-folder__grid">
      <ImgThumbCell
        v-for="c in children"
        :key="c.id"
        :name="nameOf(c)"
        :src="thumbs[c.id]"
        :selected="c.id === selectedId"
        :node-id="c.id"
        :node="c"
        :container-world="node?.worldPosition"
        @select="node?.selectChild(c.id)"
      />
    </div>

    <span class="img-folder__hint">
      {{ t('imageCount', { n: children.length }) }}<template v-if="selectedName"> · {{ t('selected', { name: selectedName }) }}</template>
    </span>

    <!-- 东南角 resize 手柄 -->
    <div class="img-folder__resize" @pointerdown.stop="startResize" :title="t('resizeHint')" />
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <ImgFolderHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.img-folder {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: @radius-md;

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

  // 缩略图网格：auto-fill 保证每格等宽等大，内容超出在框内滚动
  &__grid {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: 10px 10px 24px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 8px;
    align-content: start;
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
}
</style>