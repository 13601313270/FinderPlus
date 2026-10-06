<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { bytesToBase64, base64ToBytes } from '../../engine/data/base64'
import { ImageQualityNode, type ImageQualityFormat } from './node'
import { ImgFileNode } from '../ImgFileNode/node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import ImageQualityHelpDialog from './ImageQualityHelpDialog.vue'

// 卡片头部标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(ImageQualityNode.TYPE)

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ImageQualityNode ? n : undefined
})

// —— 拖拽：质量节点自身也参与画布移动 ——
const { startDrag } = useNodePosition(() => node.value)

type CompressorModule = typeof import('img-compressor-wasm')

/**
 * wasm 模块加载（模块级 promise 缓存，只初始化一次）。
 *
 * 先尝试包自带的 `init()`（自动 fetch 同目录 wasm）；开发环境走 http 正常。
 * 生产环境 renderer 由 loadFile 以 file:// 加载，Chromium 拒绝 file:// 的 fetch，
 * 此时回退到主进程读取 wasm 字节再 `init(bytes)`。
 */
let compressorPromise: Promise<CompressorModule> | null = null
function loadCompressor(): Promise<CompressorModule> {
  if (!compressorPromise) {
    compressorPromise = (async () => {
      const mod = await import('img-compressor-wasm')
      try {
        await mod.default()
      } catch {
        const base64 = await window.wasmApi.readCompressor()
        await mod.default({ module_or_path: base64ToBytes(base64) })
      }
      return mod
    })()
  }
  return compressorPromise
}

// —— 质量滑杆：本地值用于拖动时的实时数值显示，松手才写回节点触发重压 ——
// （wasm 压缩是同步阻塞计算，拖动过程中反复压缩会卡顿）
const sliderQuality = ref(80)

// —— 导出格式展示：随 onChanged 刷新 ——
const exportFormat = ref<ImageQualityFormat>('jpeg')

// —— 压缩结果预览（objectURL）；卸载或结果变时 revoke 防泄漏 ——
const resultUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null

// —— 体积信息：原大小（压缩时记录，不随 clearResult 清）→ 压缩后大小（由输出值反映）+ 压缩比 ——
const originalSize = ref(0)
const compressedSize = ref(0)

// —— 失败提示：存文案 key（而非已解析的字符串），模板里 t() 渲染，切语言也能跟着变 ——
const errorKey = ref<'errorUnsupported' | 'errorWasm' | null>(null)
const errorText = computed(() => (errorKey.value ? t(errorKey.value) : ''))

function clearResult(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  resultUrl.value = null
  // 只重置可再推导的压缩后大小；originalSize 由压缩时写入，
  // 若在此清零，任意一次 notifyChanged 重跑 refreshResult 后体积信息就会变成 0 B → 0 B
  compressedSize.value = 0
}

/** 从 node.imageOutput 当前值刷预览图 */
function refreshResult(n: ImageQualityNode | undefined): void {
  clearResult()
  if (!n) return
  const value = n.imageOutput.value
  if (value instanceof ImgFileValue) {
    const url = URL.createObjectURL(value.file)
    resultUrl.value = url
    revokeUrl = () => URL.revokeObjectURL(url)
    // 压缩后大小直接从输出值取，保证 refreshResult 幂等（不会被 clearResult 抹掉）
    compressedSize.value = value.file.size
  }
}

/** 压缩中标记：防止 onChanged 重入导致重复压缩 */
let compressing = false

/** 导出格式 → MIME / 扩展名 */
function mimeForFormat(format: ImageQualityFormat): string {
  return format === 'png' ? 'image/png' : 'image/jpeg'
}

function extForFormat(format: ImageQualityFormat): string {
  return format === 'png' ? '.png' : '.jpeg'
}

/** 去掉源文件名的后缀，压缩输出文件名为 原名-q质量.新后缀 */
function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(0, dot) : fileName
}

/** 字节数 → 可读体积（B / KB / MB） */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 压缩比文案：变小显示 -x%，变大显示 +x%（小图高质量转 jpeg 可能变大） */
const ratioText = computed(() => {
  if (!originalSize.value || !compressedSize.value) return ''
  const delta = (1 - compressedSize.value / originalSize.value) * 100
  const sign = delta >= 0 ? '-' : '+'
  return `${sign}${Math.abs(delta).toFixed(1)}%`
})

/**
 * 执行一次压缩：File → img-compressor-wasm → base64 → node.setOutput。
 * 调用方负责 markProcessed / clearPending。
 */
async function runCompress(n: ImageQualityNode, file: File): Promise<void> {
  const mod = await loadCompressor()
  const input = new Uint8Array(await file.arrayBuffer())
  const quality = n.qualityValue
  const format = n.exportFormat

  const out = mod.compress_image(input, quality, format)
  // 失败统一返回空数组、不抛异常：格式不支持 / 图片损坏 / 解码失败
  if (!out || out.length === 0) {
    errorKey.value = 'errorUnsupported'
    return
  }

  const mime = mimeForFormat(format)
  const fileName = `${baseName(file.name)}-q${quality}${extForFormat(format)}`
  n.setOutput(bytesToBase64(out), mime, fileName)

  originalSize.value = file.size
  compressedSize.value = out.length
  errorKey.value = null
}

/**
 * 检查是否需要压缩：读 compressSource 判断有无可用源，再用 fingerprint 去重。
 * - 端口路径（响应式）：fingerprint / 质量 / 格式任一变化就压缩
 * - 拖入路径（一次性）：pendingSource 非空表示需要压一次
 */
function handleCompress(n: ImageQualityNode | undefined): void {
  if (!n || compressing) return
  const src = n.compressSource
  if (!src) return

  const isPending = !!n.pendingSource // 拖入路径有触发信号
  const fpChanged = src.fingerprint !== n.lastProcessedFp
  const qualityChanged = n.qualityValue !== n.lastProcessedQ
  const formatChanged = n.exportFormat !== n.lastProcessedFmt

  // 去重：源文件没变 + 质量没变 + 格式没变 + 不是拖入触发 → 跳过
  if (!fpChanged && !qualityChanged && !formatChanged && !isPending) return

  compressing = true
  runCompress(n, src.file)
    .catch(() => {
      errorKey.value = 'errorWasm'
    })
    .finally(() => {
      compressing = false
      n.markProcessed(src.fingerprint, n.qualityValue, n.exportFormat)
      // 拖入路径处理完清信号（端口路径不清，保持响应式）
      if (isPending) n.clearPending()
    })
}

// —— 订阅 node.onChanged：结果刷新 + 参数同步 + 触发压缩 ——
let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      refreshResult(n)
      sliderQuality.value = n?.qualityValue ?? 80
      exportFormat.value = n?.exportFormat ?? 'jpeg'
      handleCompress(n)
    })
    refreshResult(n)
    sliderQuality.value = n?.qualityValue ?? 80
    exportFormat.value = n?.exportFormat ?? 'jpeg'
    handleCompress(n)
  },
  { immediate: true, flush: 'sync' }
)

/** 拖动中：只更新本地数值显示，不触发压缩 */
function onSliderInput(e: Event): void {
  sliderQuality.value = Number((e.target as HTMLInputElement).value)
}

/** 松手：写回节点，质量变化会触发重压 */
function onSliderChange(e: Event): void {
  node.value?.setQuality(Number((e.target as HTMLInputElement).value))
}

/** 切换导出格式 → 写回节点，格式变化会触发重压 */
function onFormatChange(e: Event): void {
  const v = (e.target as HTMLSelectElement).value
  if (v === 'jpeg' || v === 'png') node.value?.setFormat(v)
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
 */
async function handleCreateImgNode(): Promise<void> {
  const currentNode = node.value
  if (!currentNode) return
  const value = currentNode.imageOutput.value
  const file = value instanceof ImgFileValue ? value.file : undefined
  if (!file) return

  const base64 = await fileToBase64(file)
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
  <div class="quality-card" @pointerdown="startDrag" :title="t('dragHint')">
    <!-- 头部类型标签 + 帮助入口（导出格式选择移到按钮左侧） -->
    <div class="quality-card__header">
      <span class="quality-card__title">{{ nodeTitle }}</span>
      <div class="quality-card__header-actions">
        <button class="quality-card__help" type="button" :title="t('helpTitle')" @pointerdown.stop @click.stop="showHelp = true">?</button>
      </div>
    </div>

    <!-- 压缩结果预览区 -->
    <div class="quality-card__image-area">
      <img v-if="resultUrl" class="quality-card__img" :src="resultUrl" :alt="t('resultAlt')" draggable="false" />
      <!-- 无结果占位：提示两种输入方式 -->
      <div v-else class="quality-card__placeholder">
        <svg class="quality-card__icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="48" height="44" rx="6" fill="#f4f5f7" stroke="#c5cbd4" stroke-width="1.5" />
          <path d="M14 46L26 34L34 42L44 30L52 46H14Z" fill="#c5d4ff" stroke="#4a7cff" stroke-width="1.5"
            stroke-linejoin="round" />
          <circle cx="40" cy="20" r="4" fill="#4a7cff" />
        </svg>
        <span class="quality-card__placeholder-text">{{ t('placeholder') }}</span>
      </div>
    </div>

    <!-- 质量滑杆：拖动时实时显示数值，松手才重压 -->
    <div class="quality-card__quality">
      <div class="quality-card__quality-head">
        <span class="quality-card__quality-label">{{ t('qualityLabel') }}</span>
        <span class="quality-card__quality-value">{{ sliderQuality }}</span>
      </div>
      <input class="quality-card__slider" type="range" min="1" max="100" step="1" :value="sliderQuality"
        :title="t('sliderHint')" @pointerdown.stop @input="onSliderInput" @change="onSliderChange" />
    </div>

    <!-- 底部信息栏：体积/压缩比 + 导出格式 + 以压缩结果新建 ImgFileNode -->
    <div class="quality-card__footer">
      <div v-if="errorText" class="quality-card__hint quality-card__hint--error">{{ errorText }}</div>
      <div v-else-if="resultUrl" class="quality-card__hint quality-card__hint--active">
        {{ formatSize(originalSize) }} → {{ formatSize(compressedSize) }}
        <b class="quality-card__ratio">{{ ratioText }}</b>
      </div>
      <span v-else class="quality-card__hint">{{ t('hint') }}</span>
      <div v-if="resultUrl" class="quality-card__action-row">
        <select class="quality-card__format" :value="exportFormat" :title="t('formatHint')"
          @pointerdown.stop @change="onFormatChange">
          <option value="jpeg">jpeg</option>
          <option value="png">png</option>
        </select>
        <button class="quality-card__create-btn" type="button" @pointerdown.stop
          @click="handleCreateImgNode" :title="t('createNodeHint')">
          {{ t('createNode') }}
        </button>
      </div>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <ImageQualityHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.quality-card {
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
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  user-select: none;

  &__header {
    flex-shrink: 0; // 定高不参与压缩，保证 jpeg/png 下拉完整展示
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px dashed @node-border-color;
    overflow: hidden;
  }

  &__title {
    flex: 1;
    min-width: 0;
    font-size: 11px;
    font-weight: 600;
    color: #8a9099;
    letter-spacing: 0.5px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  // 头部右侧：帮助按钮
  &__header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  // 帮助按钮沿用 code 节点的灰底圆问号外观
  &__help {
    all: unset;
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

  // 导出格式下拉：贴合卡片风格的小尺寸 select
  &__format {
    flex-shrink: 0;
    height: 26px;
    font-size: 11px;
    line-height: 1.2;
    color: #4a7cff;
    background: #f4f6ff;
    border: 1px solid #b9c8ff;
    border-radius: 4px;
    padding: 2px 4px;
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

  &__quality {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__quality-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: #7a828f;
  }

  &__quality-value {
    font-size: 11px;
    font-weight: 600;
    color: #4a7cff;
  }

  &__slider {
    width: 100%;
    height: 14px;
    margin: 0;
    cursor: pointer;
    accent-color: #4a7cff;
  }

  // 纵向排布：体积信息行在上，格式下拉 + 生成按钮在下（节点宽度有限，横排会挤）
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

  &__hint {
    width: 100%;
    font-size: 11px;
    color: #7a828f;
    text-align: left;
    line-height: 1.4;

    &--active {
      color: #2d6a3f;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    &--error {
      color: #d0342c;
    }
  }

  // 按钮行：导出格式下拉在左，生成按钮填满剩余宽度
  &__action-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__ratio {
    color: #1f7a4d;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;
    padding: 1px 5px;
    border-radius: 3px;
    color: #2d6a3f;
    background: #e7f5ec;
  }

  &__create-btn {
    flex: 1;
    height: 26px;
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
