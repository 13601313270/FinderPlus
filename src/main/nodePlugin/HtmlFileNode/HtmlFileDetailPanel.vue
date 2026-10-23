<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HtmlFileNode } from './node'

/**
 * HTML 文件节点的详情面板——纯预览。
 * 把节点持有的 HTML 文本写入临时文件，iframe src="file://..." 加载。
 * 为什么不用 srcdoc：srcdoc iframe 会继承父页面 CSP，用户 HTML 里加载本地相对路径资源
 * （CSS / JS / img）会被 style-src / script-src 拦截。file:// origin 的 iframe 有独立 CSP，不受影响。
 * 支持 4 种常见视口比例：3:4、4:3、9:16、16:9。
 */
type AspectRatio = '3:4' | '4:3' | '9:16' | '16:9'

const ASPECT_OPTIONS: readonly AspectRatio[] = ['16:9', '4:3', '9:16', '3:4']

const props = defineProps<{ nodeId: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof HtmlFileNode ? n : undefined
})

const htmlContent = ref('')
const filePath = ref('')
const aspect = ref<AspectRatio>('16:9')
const stageRef = ref<HTMLElement | null>(null)
const stageSize = ref<{ w: number; h: number }>({ w: 0, h: 0 })
const previewUrl = ref('')
let offChanged: (() => void) | undefined
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const n = node.value
  if (n) {
    syncFromNode(n)
    offChanged = n.onChanged(() => syncFromNode(n))
  }
  // 监听舞台尺寸变化，让 iframe 按比例自适应
  if (stageRef.value) {
    resizeObserver = new ResizeObserver(() => {
      const r = stageRef.value!.getBoundingClientRect()
      stageSize.value = { w: r.width - 32, h: r.height - 32 } // 减去 padding 16px × 2
    })
    resizeObserver.observe(stageRef.value)
    const r = stageRef.value.getBoundingClientRect()
    stageSize.value = { w: r.width - 32, h: r.height - 32 }
  }
})

onBeforeUnmount(() => {
  offChanged?.()
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(() => props.nodeId, () => {
  const n = node.value
  if (n) {
    syncFromNode(n)
    offChanged?.()
    offChanged = n.onChanged(() => syncFromNode(n))
  }
})

function syncFromNode(n: HtmlFileNode): void {
  htmlContent.value = n.content
  filePath.value = n.fileName
}

/**
 * 把绝对路径换算成 file:// 目录 URL（保留末尾 /），
 * 让 temp HTML 里的相对路径（./style.css）仍然指向原始 HTML 所在目录。
 */
function computeBaseDirUrl(absPath: string): string | null {
  if (!absPath) return null
  const normalized = absPath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash < 0) return null
  return 'file://' + normalized.slice(0, lastSlash + 1)
}

/**
 * 构造要写入临时文件的完整 HTML：在 <head> 里插入 <base> 标签，
 * base href 指向原始 HTML 文件所在目录，这样里面的相对路径能正确解析。
 */
function buildPreviewHtml(raw: string, originalPath: string): string {
  if (!raw) return ''
  const baseUrl = computeBaseDirUrl(originalPath)
  if (!baseUrl) return raw
  if (/<head[\s>]/i.test(raw)) {
    return raw.replace(/<head([\s>])/i, `<head$1<base href="${baseUrl}">`)
  }
  if (/<html[\s>]/i.test(raw)) {
    return raw.replace(/<html([\s>])/i, `<html$1<head><base href="${baseUrl}"></head>`)
  }
  return `<base href="${baseUrl}">${raw}`
}

/**
 * 内容 / 路径变化时，异步写 temp 文件并拿到 file:// URL。
 * 用 watchEffect-ish 的方式：用 computed 派生要写的内容，watch 它的变化。
 */
const contentStamp = computed(() => ({ c: htmlContent.value, p: filePath.value }))
watch(contentStamp, async ({ c, p }) => {
  if (!c) {
    previewUrl.value = ''
    return
  }
  const withBase = buildPreviewHtml(c, p)
  // @ts-ignore — 只在 renderer 里执行，window.fileApi 一定存在
  previewUrl.value = await window.fileApi.writePreviewHtml(props.nodeId, withBase)
}, { immediate: true })

/**
 * 根据舞台可用尺寸 + 目标比例，算出能放下的最大矩形像素尺寸。
 * 纯 CSS aspect-ratio 只认一边（width:100% 时竖屏高度会溢出），
 * 这里直接算好 pixel 值赋给 frame-wrap，4 种比例都能完美塞进固定高的舞台。
 */
const frameSizeStyle = computed(() => {
  const { w: sw, h: sh } = stageSize.value
  if (!sw || !sh) return { width: '100%', height: 'auto' }
  const [rw, rh] = aspect.value.split(':').map(Number)
  const targetRatio = rw / rh
  const stageRatio = sw / sh
  let w: number
  let h: number
  if (stageRatio > targetRatio) {
    // 舞台更宽 → 高度撑满，宽度按比例缩
    h = sh
    w = h * targetRatio
  } else {
    // 舞台更窄 → 宽度撑满，高度按比例缩
    w = sw
    h = w / targetRatio
  }
  return { width: `${Math.round(w)}px`, height: `${Math.round(h)}px` }
})
</script>

<template>
  <div class="html-preview">
    <!-- 比例切换条 -->
    <div class="html-preview__toolbar">
      <span class="html-preview__toolbar-label">视口比例</span>
      <div class="html-preview__ratio-buttons">
        <button
          v-for="r in ASPECT_OPTIONS"
          :key="r"
          class="html-preview__ratio-btn"
          :class="{ 'is-active': aspect === r }"
          type="button"
          :title="r"
          @click="aspect = r"
        >{{ r }}</button>
      </div>
    </div>

    <!-- 预览区 -->
    <div ref="stageRef" class="html-preview__stage">
      <template v-if="!previewUrl">
        <div class="html-preview__empty">
          暂无内容，请先选择或输入 HTML 文件
        </div>
      </template>
      <template v-else>
        <div class="html-preview__frame-wrap" :style="frameSizeStyle">
          <iframe
            class="html-preview__frame"
            :src="previewUrl"
            sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less">
.html-preview {
  box-sizing: border-box;
  height: 100%;
  width: 100%;
  background: #f4f5f7;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  // —— 工具栏 ——
  &__toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;
  }

  &__toolbar-label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  &__ratio-buttons {
    display: flex;
    gap: 4px;
  }

  &__ratio-btn {
    all: unset;
    cursor: pointer;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 500;
    color: #4b5563;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: #fff;
    line-height: 1;
    transition: all 0.12s;

    &:hover {
      border-color: #2563eb;
      color: #2563eb;
    }

    &.is-active {
      background: #2563eb;
      border-color: #2563eb;
      color: #fff;
    }
  }

  // —— 空状态 ——
  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 13px;
    font-style: italic;
  }

  // —— 预览舞台（始终存在，内部 v-if/v-else 切换空态和 iframe）——
  &__stage {
    flex: 1;
    height: calc(85vh - 55px - 36px - 32px);
    min-height: calc(85vh - 55px - 36px - 32px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    overflow: hidden;
  }

  // —— iframe 外壳，实际像素由 frameSizeStyle 注入 ——
  &__frame-wrap {
    background: #fff;
    border-radius: 6px;
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
}
</style>
