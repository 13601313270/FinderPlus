<script setup lang="ts">
/**
 * HtmlFileValue 渲染器：HTML 源码预览 + 完整页面渲染。
 *
 * tooltip / inline 模式：显示文件名 + 源码前 N 字符预览。
 *
 * detail 模式：
 *   - 顶部 tab 切换：Preview（iframe 渲染效果）/ Source（完整 HTML 源码）
 *   - Preview tab 额外有视口比例切换（16:9 / 4:3 / 9:16 / 3:4）
 *   - iframe 走主进程 IPC 写临时文件 → file:// URL 加载，绕过 blob: origin 安全限制
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  value: { file?: File; displayLabel: string; fingerprint?: string }
  context?: 'tooltip' | 'detail' | 'inline'
}>()

type AspectRatio = '3:4' | '4:3' | '9:16' | '16:9'
type DetailView = 'preview' | 'source'

/** tooltip / inline 的紧凑预览（截取前 N 字符） */
const preview = ref<string>('')
/** detail 模式的完整源码（不截断） */
const fullSource = ref<string>('')
const previewUrl = ref<string>('')

const detailView = ref<DetailView>('preview')
const aspect = ref<AspectRatio>('16:9')
const stageRef = ref<HTMLElement | null>(null)
const stageSize = ref<{ w: number; h: number }>({ w: 0, h: 0 })
let resizeObserver: ResizeObserver | null = null

const PREVIEW_TOOLTIP = 80
const previewLen = computed(() => PREVIEW_TOOLTIP)

/** detail 模式的临时文件 key——优先 fingerprint，退化到 name+size */
const tempKey = computed(() => {
  const v = props.value
  if (v.fingerprint) return v.fingerprint.replace(/[^\w\-]/g, '_')
  const f = v.file
  if (!f) return 'null'
  return `${f.name}_${f.size}`.replace(/[^\w\-]/g, '_')
})

/** 舞台尺寸变化时，重算 iframe 外壳的像素宽高 */
const frameSizeStyle = computed(() => {
  const { w: sw, h: sh } = stageSize.value
  if (!sw || !sh) return { width: '100%', height: 'auto' }
  const [rw, rh] = aspect.value.split(':').map(Number)
  const targetRatio = rw / rh
  const stageRatio = sw / sh
  let w: number
  let h: number
  if (stageRatio > targetRatio) {
    h = sh
    w = h * targetRatio
  } else {
    w = sw
    h = w / targetRatio
  }
  return { width: `${Math.round(w)}px`, height: `${Math.round(h)}px` }
})

/** 启动 ResizeObserver 监听舞台尺寸；幂等——先断开旧的再挂新的 */
function startResizeObserver(): void {
  stopResizeObserver()
  const el = stageRef.value
  if (!el) return
  resizeObserver = new ResizeObserver(() => {
    const r = el.getBoundingClientRect()
    stageSize.value = { w: r.width - 16, h: r.height - 16 } // padding 8px × 2
  })
  resizeObserver.observe(el)
  const r = el.getBoundingClientRect()
  stageSize.value = { w: r.width - 16, h: r.height - 16 }
}

function stopResizeObserver(): void {
  resizeObserver?.disconnect()
  resizeObserver = null
}

// context 变化：detail → 启动；其他 → 停止
watch(
  () => props.context,
  (ctx) => {
    if (ctx === 'detail') {
      // DOM 就绪后再挂
      setTimeout(startResizeObserver, 0)
    } else {
      stopResizeObserver()
    }
  },
  { immediate: true }
)

// detail 内部切 tab：切回 preview 时 stageRef 已重挂，重启 ResizeObserver
watch(
  () => detailView.value,
  (view) => {
    if (view === 'preview' && props.context === 'detail') {
      setTimeout(startResizeObserver, 0)
    }
  }
)

async function loadContent(): Promise<void> {
  const f = props.value.file
  if (!f) {
    preview.value = '(null)'
    fullSource.value = ''
    previewUrl.value = ''
    return
  }

  try {
    const text = await f.text()
    // tooltip / inline 模式：截取前 N 字符
    preview.value = text.slice(0, previewLen.value)
    // detail 模式：存完整源码
    fullSource.value = text

    if (props.context === 'detail') {
      previewUrl.value = await (window as unknown as {
        fileApi?: { writePreviewHtml: (key: string, html: string) => Promise<string> }
      }).fileApi?.writePreviewHtml(tempKey.value, text) ?? ''
    } else {
      previewUrl.value = ''
    }
  } catch {
    preview.value = '(读取失败)'
    fullSource.value = ''
    previewUrl.value = ''
  }
}

watch(() => props.value.file, loadContent, { immediate: true })
watch(previewLen, loadContent)

onBeforeUnmount(() => {
  stopResizeObserver()
})
</script>

<template>
  <div class="v-html" :class="{ 'v-html--detail': context === 'detail' }">
    <!-- detail 模式：select 切换 Viewport + Source -->
    <template v-if="context === 'detail'">
      <!-- 顶部工具栏 -->
      <div class="v-html__toolbar">
        <select class="v-html__select" :value="detailView" @change="detailView = ($event.target as HTMLSelectElement).value as DetailView">
          <option value="preview">Preview</option>
          <option value="source">Source</option>
        </select>
        <!-- 比例下拉只在 Preview 显示 -->
        <template v-if="detailView === 'preview'">
          <div class="v-html__toolbar-spacer"></div>
          <select class="v-html__select" :value="aspect" @change="aspect = ($event.target as HTMLSelectElement).value as AspectRatio">
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="9:16">9:16</option>
            <option value="3:4">3:4</option>
          </select>
        </template>
      </div>

      <!-- Preview tab：iframe 渲染 -->
      <template v-if="detailView === 'preview'">
        <div ref="stageRef" class="v-html__stage">
          <template v-if="previewUrl">
            <div class="v-html__frame-wrap" :style="frameSizeStyle">
              <iframe
                class="v-html__frame"
                :src="previewUrl"
                sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                frameborder="0"
              />
            </div>
          </template>
          <div v-else class="v-html__empty">暂无内容</div>
        </div>
      </template>

      <!-- Source tab：完整 HTML 源码，不截断 -->
      <template v-else>
        <pre class="v-html__source-full">{{ fullSource }}</pre>
      </template>
    </template>

    <!-- tooltip / inline 模式：紧凑源码预览 -->
    <template v-else>
      <div class="v-html__name">{{ value.displayLabel }}</div>
      <pre v-if="preview" class="v-html__preview">{{ preview }}</pre>
    </template>
  </div>
</template>

<style scoped lang="less">
.v-html {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;

  &__name {
    font-size: 10px;
    color: #9ca3af;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__preview {
    margin: 0;
    padding: 4px 6px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 3px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #e5e7eb;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 60px;
    overflow: hidden;
  }

  &--detail {
    gap: 0;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
    background: #fff;
  }

  // —— 工具栏：select 下拉 + 标签 ——
  &__toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: #fafbfc;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;
  }

  &__toolbar-spacer {
    flex: 1;
  }

  &__toolbar-label {
    font-size: 11px;
    font-weight: 600;
    color: #374151;
  }

  &__select {
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 500;
    color: #4b5563;
    border: 1px solid #d1d5db;
    border-radius: 3px;
    background: #fff;
    line-height: 1;
    cursor: pointer;
    outline: none;
    transition: border-color 0.12s;

    &:hover {
      border-color: #2563eb;
    }

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
    }
  }

  // —— Preview tab 舞台 ——
  &__stage {
    flex: 1;
    min-height: 380px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    overflow: hidden;
    background: #f4f5f7;
  }

  &__empty {
    font-size: 12px;
    color: #9ca3af;
    font-style: italic;
  }

  // —— iframe 外壳，实际像素由 frameSizeStyle 注入 ——
  &__frame-wrap {
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    flex-shrink: 0;
  }

  &__frame {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
    background: #fff;
  }

  // —— Source tab 完整源码 ——
  &__source-full {
    margin: 0;
    flex: 1;
    min-height: 380px;
    padding: 12px 14px;
    background: #1e1e1e;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: #d4d4d4;
    white-space: pre-wrap;
    word-break: break-all;
    overflow-y: auto;
  }
}
</style>
