<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { ImageCompressNode, type ImageExportFormat } from './node'
import { ImgFileNode } from '../ImgFileNode/node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import ImageCompressHelpDialog from './ImageCompressHelpDialog.vue'

// 卡片头部标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(ImageCompressNode.TYPE)

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ImageCompressNode ? n : undefined
})

// —— 帮助浮层开关（弹窗壳由 HelpDialog 负责） ——
const showHelp = ref(false)

// —— 目标尺寸（最长边像素）展示：随 onChanged 刷新 ——
const targetSize = ref(800)

// —— 导出格式展示：随 onChanged 刷新 ——
const exportFormat = ref<ImageExportFormat>('jpg')

// —— 压缩结果预览（objectURL）；卸载或结果变时 revoke 防泄漏 ——
const resultUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null

// —— 体积信息：直接从 node 实例读取（压缩逻辑已迁移到 node.ts） ——
const sourceSize = computed(() => node.value?.sourceSizeBytes ?? 0)
const compressedSize = computed(() => node.value?.compressedSizeBytes ?? 0)

function clearResult(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  resultUrl.value = null
}

/** 从 node.imageOutput 当前值刷预览图 */
function refreshResult(n: ImageCompressNode | undefined): void {
  clearResult()
  if (!n) return
  const value = n.imageOutput.value
  if (value instanceof ImgFileValue && value.file) {
    const url = URL.createObjectURL(value.file)
    resultUrl.value = url
    revokeUrl = () => URL.revokeObjectURL(url)
  }
}

/** 字节数 → 可读体积（B / KB / MB） */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 原始体积文案（无数据时占位） */
const sourceSizeText = computed(() => (sourceSize.value > 0 ? formatSize(sourceSize.value) : '--'))

/** 压缩后体积文案（无数据时占位） */
const compressedSizeText = computed(() => (compressedSize.value > 0 ? formatSize(compressedSize.value) : '--'))

/** 体积减少百分比（正=变小，负=变大；无数据为 null） */
const reducePercent = computed(() => {
  if (sourceSize.value <= 0 || compressedSize.value <= 0) return null
  return Math.round((1 - compressedSize.value / sourceSize.value) * 100)
})

/** 百分比文案：变小显示 -x%，变大显示 +x% */
const reduceText = computed(() => {
  const p = reducePercent.value
  if (p === null) return ''
  return `${p >= 0 ? '-' : '+'}${Math.abs(p)}%`
})

// —— 订阅 node.onChanged：压缩逻辑已迁移到 node.ts，这里只做 UI 刷新（预览图、尺寸、格式） ——
let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      refreshResult(n)
      targetSize.value = n?.targetSize ?? 800
      exportFormat.value = n?.exportFormat ?? 'jpg'
    })
    refreshResult(n)
    targetSize.value = n?.targetSize ?? 800
    exportFormat.value = n?.exportFormat ?? 'jpg'
  },
  { immediate: true, flush: 'sync' }
)

/** 切换导出格式 → 写回节点，格式变化会触发重压 */
function onFormatChange(e: Event): void {
  const v = (e.target as HTMLSelectElement).value
  if (v === 'jpg' || v === 'png') node.value?.setExportFormat(v)
}

/** File → base64 字符串（给 writeBuffer 用） */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * 点击「生成图片文件节点」：以压缩结果为基础新建一个 ImgFileNode。
 * - writeBuffer 把压缩结果 File 落盘到画布目录（自动去重名）
 * - 新节点位置 = 当前节点 position + [30, 30] 偏移
 * - 新节点 render.vue 挂载后 watch(fileName) 自动读回内容展示
 */
async function handleCreateImgNode(): Promise<void> {
  const currentNode = node.value
  if (!currentNode) return
  const value = currentNode.imageOutput.value
  const file = value instanceof ImgFileValue ? value.file : undefined
  if (!file) return

  const base64 = await fileToBase64(file)
  // @ts-ignore
  const written = await window.fileApi.writeBuffer(file.name, base64)

  const [cx, cy] = currentNode.position
  const newNode = new ImgFileNode(
    `${ImgFileNode.TYPE}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  )
  newNode.setPosition(cx + 30, cy + 30)
  newNode.setFile(written.fileName, written.size)
  workspaceScene.addNode(newNode)
}

onUnmounted(() => {
  unsubscribe?.()
  clearResult()
})
</script>

<template>
  <div class="compress-card">
    <!-- 头部：通用 NodeHeader，自带拖拽、最小化、帮助按钮 -->
    <NodeHeader :title="nodeTitle" @help="showHelp = true" />

    <!-- 压缩结果预览区 -->
    <div class="compress-card__image-area">
      <img v-if="resultUrl" class="compress-card__img" :src="resultUrl" :alt="t('resultAlt')" draggable="false" />
      <!-- 无结果占位：提示两种输入方式 -->
      <div v-else class="compress-card__placeholder">
        <svg class="compress-card__icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="48" height="44" rx="6" fill="#f4f5f7" stroke="#c5cbd4" stroke-width="1.5" />
          <path d="M14 46L26 34L34 42L44 30L52 46H14Z" fill="#c5d4ff" stroke="#4a7cff" stroke-width="1.5"
            stroke-linejoin="round" />
          <circle cx="40" cy="20" r="4" fill="#4a7cff" />
        </svg>
        <span class="compress-card__placeholder-text">{{ t('placeholder', { size: targetSize }) }}</span>
      </div>
    </div>

    <!-- 底部信息栏：原始 → 压缩后 体积 + 减少百分比，按钮置于其下（空间有限纵向排布） -->
    <div class="compress-card__footer">
      <template v-if="resultUrl">
        <div class="compress-card__stats">
          <span class="compress-card__stat">
            <span class="compress-card__stat-value">{{ sourceSizeText }}</span>
            <span class="compress-card__stat-arrow">→</span>
            <span class="compress-card__stat-value">{{ compressedSizeText }}</span>
          </span>
          <span
            class="compress-card__reduce"
            :class="{ 'compress-card__reduce--up': reducePercent !== null && reducePercent < 0 }"
          >{{ reduceText }}</span>
        </div>
        <div class="compress-card__action-row">
          <select
            class="compress-card__format"
            :value="exportFormat"
            :title="t('formatHint')"
            @pointerdown.stop
            @change="onFormatChange"
          >
            <option value="jpg">jpg</option>
            <option value="png">png</option>
          </select>
          <button class="compress-card__create-btn" type="button" @pointerdown.stop
            @click="handleCreateImgNode" :title="t('createNodeHint')">
            {{ t('createNode') }}
          </button>
        </div>
      </template>
      <span v-else class="compress-card__hint">{{ t('hint') }}</span>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <ImageCompressHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.compress-card {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 8px;
  padding-top: 0;
  user-select: none;

  // 导出格式下拉：贴合卡片风格的小尺寸 select
  &__format {
    flex-shrink: 0;
    font-size: 11px;
    line-height: 1.2;
    color: #4a7cff;
    background: #f4f6ff;
    border: 1px solid #b9c8ff;
    border-radius: 4px;
    padding: 2px 4px;
    height: 26px;
    cursor: pointer;
    outline: none;

    &:hover {
      border-color: #4a7cff;
    }
  }

  &__image-area {
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: 6px;
    overflow: hidden;
    background: #f4f5f7;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
    pointer-events: none;
    background: #fff;
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: @color-text-weak;
  }

  &__icon-svg {
    width: 40px;
    height: 40px;
    display: block;
    flex-shrink: 0;
  }

  &__placeholder-text {
    font-size: 11px;
    color: #9aa1ad;
    font-style: italic;
  }

  // 纵向排布：体积信息行在上，按钮在下（节点宽度有限，横排会挤）
  &__footer {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafbfc;
  }

  // 体积信息行：原始 → 压缩后 + 减少百分比
  &__stats {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  &__stat {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
    min-width: 0;
    font-size: 11px;
    line-height: 1.3;
    white-space: nowrap;
  }

  // 体积箭头：原始 → 压缩后 之间的连接符
  &__stat-arrow {
    color: #b3b9c4;
  }

  &__stat-value {
    font-weight: 600;
    color: #333a45;
  }

  // 减少百分比徽标（默认绿色=变小；变大时加 --up 转橙色）
  &__reduce {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;
    padding: 1px 5px;
    border-radius: 3px;
    color: #2d6a3f;
    background: #e7f5ec;

    &--up {
      color: #b4531f;
      background: #fdeee2;
    }
  }

  &__hint {
    font-size: 11px;
    color: #7a828f;
    text-align: left;
    line-height: 1.4;
  }

  // 按钮行：导出格式下拉在左，生成按钮填满剩余宽度
  &__action-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__create-btn {
    flex: 1;
    min-width: 0;
    padding: 4px 10px;
    border: 1px solid #4a7cff;
    border-radius: 4px;
    background: #4a7cff;
    color: #fff;
    font-size: 11px;
    line-height: 1.3;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease;
    height: 26px;

    &:hover {
      background: #3d6ce0;
      border-color: #3d6ce0;
    }

    &:active {
      transform: translateY(1px);
    }
  }
}
</style>
