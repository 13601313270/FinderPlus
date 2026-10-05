<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, type CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  portElementRef,
  portKey,
  type CanvasElementRef,
  type PortLike,
  type PortSide
} from '@renderer/canvas/elements'
import { connectionDrag, startConnectDrag } from '@renderer/canvas/connectionDrag'

const props = defineProps<{
  nodeId: string
  port: PortLike
  side: PortSide
  /** 端口显示文案：由父组件 NodePorts 按当前语言解析后下传（label 是引擎普通对象，子组件 watch 不到） */
  label: string
  /** 输入端口才会是 true：当前属于脏状态（值变了但节点还没消化） */
  isDirty?: boolean
  hideLabel?: boolean
}>()

const isIn = props.side === 'in'

const { t, te } = useI18n()

// 每个组件实例只管自己这一个端口的 ref，不需要 Map 缓存
// portRef 包装 portElementRef 以同时满足注册表登记 + tooltip 取原始 DOM
const portDom = ref<HTMLElement | null>(null)
const _originalPortRef = portElementRef(props.nodeId, props.side, props.port)
const portRef: CanvasElementRef = (el) => {
  _originalPortRef(el)
  portDom.value = el instanceof HTMLElement ? el : null
}

// 跟踪当前有没有接边：初始从 incomingEdgeCount 取，后续靠 onEdgeBinding 事件更新
const hasConnection = ref(false)

// 「显示默认值胶囊」的条件：输入端口 + 有默认值 + 没有连线
const showDefaultCapsule = computed(() =>
  isIn && !!props.port.defaultValueLabel && !hasConnection.value
)

let unsubEdgeBinding: (() => void) | undefined

onMounted(() => {
  // 初始化连接状态——组件挂载时可能已经连着边了
  hasConnection.value = (props.port.incomingEdgeCount ?? 0) > 0

  // 输入端口才有 onEdgeBinding 方法，OutputPort 侧暂时没有对应订阅需求
  if (isIn && props.port.onEdgeBinding) {
    unsubEdgeBinding = props.port.onEdgeBinding((event) => {
      hasConnection.value = event.kind === 'bind'
        ? true
        : (props.port.incomingEdgeCount ?? 0) > 0
    })
  }
})

onUnmounted(() => {
  // 必须配对解绑，否则监听残留在引擎端口实例里（匿名函数解绑失效问题）
  if (unsubEdgeBinding) {
    unsubEdgeBinding()
    unsubEdgeBinding = undefined
  }
})

function titleOf(port: PortLike, direction: string): string {
  const kinds = port.acceptValueNames ?? (port.outputValueName ? [port.outputValueName] : [])
  return kinds.length > 0
    ? `${direction}端口 ${props.label}（${kinds.join(' / ')}）`
    : `${direction}端口 ${props.label}`
}

function displayKinds(port: PortLike): readonly string[] {
  if (port.acceptValueNames?.length) return port.acceptValueNames
  if (port.outputValueName) return [port.outputValueName]
  return []
}

/**
 * 端口类型胶囊的显示文案。
 *
 * 引擎内置的类型（number / string / file 等，见 Value.ts 的 BUILTIN_VALUE_KINDS）都有词条；
 * 插件自定义的类型没有词条，原样显示标识符——ValueKind 是开放字符串，
 * UI 不该硬编码一份「合法类型」清单去拦截第三方插件的种类。
 */
function kindLabel(kind: string): string {
  const key = `valueKind.${kind}`
  return te(key) ? t(key) : kind
}

function onOutputPointerDown(port: PortLike, event: PointerEvent): void {
  startConnectDrag(props.nodeId, port.id, event)
}

function highlightOf(port: PortLike): string {
  if (!connectionDrag.active) return ''
  const key = portKey(props.nodeId, props.side, port.id)
  if (key === connectionDrag.sourceKey) return 'port--source'
  if (key !== connectionDrag.targetKey) return ''
  return connectionDrag.targetOk ? 'port--target' : 'port--invalid'
}

// ── tooltip ──────────────────────────────────────────────

const PORTAL_GAP = 6       // 气泡与圆点间距
const PORTAL_MARGIN = 8    // 气泡距视口边缘留白
const TOOLTIP_DELAY = 500 // hover 停顿 0.5 秒才弹出（毫秒）

const tooltipVisible = ref(false)
const tooltipStyle = ref<CSSProperties>({})
const tooltipFlipped = ref(false)  // true 表示气泡在圆点下方（翻转方向）
const tooltipEl = ref<HTMLElement | null>(null)   // 用来量真实尺寸

let showTimer: ReturnType<typeof setTimeout> | null = null

/** tooltip 展示的图片预览 URL 列表（hover 时 createObjectURL，hide 时 revoke） */
const imageUrls = ref<{ url: string; name: string }[]>([])

/** hover 期间累积的 objectURL，hide 时统一 revoke 防内存泄漏 */
let pendingRevoke: string[] = []
function revokeAllUrls(): void {
  for (const u of pendingRevoke) URL.revokeObjectURL(u)
  pendingRevoke = []
  imageUrls.value = []
}

/** tooltip 展示内容：有缓存值时列出标签，否则显示"暂无数据" */
const tooltipLines = computed(() => {
  if (isIn) {
    const values = props.port.currentValues
    if (values && values.length > 0) return values
    // 上游空但有 defaultValueLabel（单值场景）也展示
    if (props.port.defaultValueLabel) return [props.port.defaultValueLabel]
    return []
  } else {
    const v = props.port.currentValueLabel
    return v ? [v] : []
  }
})

/** hover 时收集图片 File，返回 File[] */
function collectImageFiles(): readonly File[] {
  if (isIn) {
    const files = props.port.currentValueFiles
    if (!files?.length) return []
    return files.filter(f => f.type.startsWith('image/'))
  } else {
    const f = props.port.currentValueFile
    return f && f.type.startsWith('image/') ? [f] : []
  }
}

function clearShowTimer(): void {
  if (showTimer !== null) {
    clearTimeout(showTimer)
    showTimer = null
  }
}

function showTooltip(): void {
  // 拖拽连线时不弹 tooltip，免得视觉干扰
  if (connectionDrag.active) return

  clearShowTimer()
  showTimer = setTimeout(() => {
    showTimer = null

    // 图片预览：hover 时才 createObjectURL，避免常驻内存
    const imgs = collectImageFiles()
    revokeAllUrls()  // 先清掉上一轮的，防止同端口重复 hover 时残留
    for (const f of imgs) {
      const url = URL.createObjectURL(f)
      imageUrls.value.push({ url, name: f.name })
      pendingRevoke.push(url)
    }

    // 先让它渲染出来（随便放个初始位置），渲染完再量真实尺寸精确定位
    tooltipStyle.value = { left: '0px', top: '0px' }
    tooltipVisible.value = true
    nextTick(() => {
      updateTooltipPosition()
    })
  }, TOOLTIP_DELAY)
}

function hideTooltip(): void {
  clearShowTimer()
  tooltipVisible.value = false
  revokeAllUrls()
}

onUnmounted(() => {
  clearShowTimer()
  revokeAllUrls()
})

/**
 * 用 tooltip 自己的**真实 DOM 尺寸**算 fixed 定位。
 * —— 之前的硬编码 estimatedHeight + translateY(-100%) 有两个 bug：
 *    1) 估不准（图片加载后撑大）；2) translateY 本身已经向上移了 tooltipHeight，
 *       top 又提前减了一次 estimatedHeight → 减两遍，气泡飞到完全不相关的位置。
 * —— 现在先渲染，再量，一次算对。
 */
function updateTooltipPosition(): void {
  const port = portDom.value
  const tip = tooltipEl.value
  if (!port || !tip) return

  // 强制 layout：图片可能还在加载中，没加载完时先按现有内容量一版，
  // 图片 @load 时会再调一次本函数
  tip.offsetWidth // 触发 layout

  const portRect = port.getBoundingClientRect()
  const tipRect = tip.getBoundingClientRect()
  const cx = portRect.left + portRect.width / 2

  // 先算水平：以端口中心为锚点，左右不越界
  let left = cx - tipRect.width / 2
  if (left < PORTAL_MARGIN) left = PORTAL_MARGIN
  if (left + tipRect.width > window.innerWidth - PORTAL_MARGIN) {
    left = window.innerWidth - PORTAL_MARGIN - tipRect.width
  }

  // 垂直：先假设放在圆点上方，算剩余空间
  const height = tipRect.height
  const spaceAbove = portRect.top - PORTAL_GAP - height - PORTAL_MARGIN
  const spaceBelow = window.innerHeight - portRect.bottom - PORTAL_GAP - height - PORTAL_MARGIN
  const flip = spaceAbove < 0 && spaceBelow > spaceAbove

  tooltipFlipped.value = flip

  const top = flip
    ? portRect.bottom + PORTAL_GAP                       // 底部对齐
    : portRect.top - PORTAL_GAP - height                 // 顶部对齐到圆点上方

  tooltipStyle.value = {
    left: `${left}px`,
    top: `${top}px`
    // 不再用 transform，固定 top/left 就是最终位置
  }
}
</script>

<template>
  <!--
    每个端口项占一个 flex item：圆点 + label 水平排列。
    左列：圆点在右（紧贴 content 那侧），label 在左；
    右列：圆点在左（紧贴 content 那侧），label 在右。
    这样圆点探出 ports-col 边缘正好落在 content 侧线上。
  -->
  <div class="port-item" :class="{ 'port-item--left': isIn, 'port-item--right': !isIn }">
    <!-- 左列：label 在圆点左边，文本右对齐（靠近圆点） -->
    <div v-if="isIn && !hideLabel" class="port-label port-label--right-edge">
      <span class="port-label__main">{{ label }}</span>
      <div v-if="displayKinds(port).length" class="port-label__kinds">
        <span
          v-for="k in displayKinds(port)"
          :key="k"
          class="port-label__kind"
        >{{ kindLabel(k) }}</span>
      </div>
    </div>

    <span
      :ref="portRef"
      class="port"
      :class="[
        isIn ? 'port--in' : 'port--out',
        highlightOf(port),
        showDefaultCapsule ? 'port--default' : '',
        isDirty && isIn ? 'port--dirty' : ''
      ]"
      :data-port-id="port.id"
      :title="titleOf(port, isIn ? '输入' : '输出')"
      @pointerdown="!isIn && onOutputPointerDown(port, $event)"
      @mouseenter="showTooltip"
      @mouseleave="hideTooltip"
    >
      <template v-if="showDefaultCapsule">{{ port.defaultValueLabel }}</template>
    </span>

    <!-- 右列：label 在圆点右边，文本左对齐（靠近圆点） -->
    <div v-if="!isIn && !hideLabel" class="port-label port-label--left-edge">
      <span class="port-label__main">{{ label }}</span>
      <div v-if="displayKinds(port).length" class="port-label__kinds">
        <span
          v-for="k in displayKinds(port)"
          :key="k"
          class="port-label__kind"
        >{{ kindLabel(k) }}</span>
      </div>
    </div>
  </div>

  <!--  tooltip：Teleport 到 body，fixed 定位，避免被节点卡片 overflow 裁剪  -->
  <Teleport to="body">
    <div
      v-if="tooltipVisible"
      ref="tooltipEl"
      class="port-tooltip"
      :class="{ 'port-tooltip--flipped': tooltipFlipped }"
      :style="tooltipStyle"
      @mouseenter="hideTooltip"
    >
      <div class="port-tooltip__header">
        <span class="port-tooltip__side">{{ isIn ? '输入' : '输出' }}</span>
        <span class="port-tooltip__name">{{ label }}</span>
      </div>

      <!--  图片预览网格：hover 时 createObjectURL，单图大图，多图 2 列  -->
      <div v-if="imageUrls.length > 0" class="port-tooltip__images"
           :class="{ 'port-tooltip__images--single': imageUrls.length === 1 }">
        <div
          v-for="(img, i) in imageUrls"
          :key="i"
          class="port-tooltip__thumb"
        >
          <img :src="img.url" :alt="img.name" @load="updateTooltipPosition" />
          <span class="port-tooltip__thumb-name">{{ img.name }}</span>
        </div>
      </div>

      <!--  文本标签行（图片端口也会显示文件名字段对应的 displayLabel）  -->
      <div v-if="tooltipLines.length > 0" class="port-tooltip__values">
        <div
          v-for="(line, i) in tooltipLines"
          :key="i"
          class="port-tooltip__value"
        >{{ line }}</div>
      </div>

      <div v-if="imageUrls.length === 0 && tooltipLines.length === 0"
           class="port-tooltip__empty">暂无数据</div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.port-item {
  display: flex;
  align-items: center;
  position: relative;
  // 两行 label + 圆点：11px + 8px + 间距 ≈ 22px，留一点余量
  min-height: 28px;

  &--left {
    justify-content: flex-end;
  }

  &--right {
    justify-content: flex-start;
  }
}

.port {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  border: 2px solid @color-primary;
  border-radius: 50%;
  background: @color-surface;
  user-select: none;
  flex-shrink: 0;

  &--out {
    cursor: crosshair;
  }

  // 从 ports-col 里探出到 content 侧线：圆心正好在 ports-col 边缘
  &--in {
    margin-right: -6px;
  }

  &--out {
    margin-left: -6px;
  }

  &--source,
  &--target,
  &--invalid {
    box-shadow: 0 0 0 4px rgba(59, 124, 255, 0.18);
  }

  &--target {
    border-color: @color-ok;
    box-shadow: 0 0 0 4px rgba(46, 174, 103, 0.22);
  }

  &--invalid {
    border-color: @color-danger;
    box-shadow: 0 0 0 4px rgba(217, 75, 75, 0.2);
  }

  // 脏输入端口：橙色外圈 + 内部橙色圆点填充，跟节点外壳的脏边框同色系
  &--dirty {
    border-color: #f0a020;
    background: #f0a020;
    box-shadow: 0 0 0 3px rgba(240, 160, 32, 0.25);
  }

  // 默认值胶囊形状：小圆变扁胶囊，中间容纳文本
  &--default {
    width: auto;
    min-width: 24px;
    height: 18px;
    padding: 0 6px;
    border-radius: 9px;
    font-size: 10px;
    line-height: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: default;
  }
}

.port-label {
  display: flex;
  flex-direction: column;
  gap: 1px;
  pointer-events: none;

  &--right-edge {
    align-items: flex-end; // 左列：文字右对齐，靠圆点那侧
    text-align: right;
    margin-right: 4px;
  }

  &--left-edge {
    align-items: flex-start; // 右列：文字左对齐，靠圆点那侧
    text-align: left;
    margin-left: 4px;
  }

  &__main {
    font-size: 11px;
    line-height: 1.1;
    color: @color-text-weak;
    white-space: nowrap;
  }

  // 多行类型标签容器：grid 每行最多两个
  &__kinds {
    display: grid;
    grid-template-columns: repeat(2, max-content);
    gap: 0 4px;
  }

  &__kind {
    font-size: 9px;
    line-height: 1;
    color: lighten(@color-text-weak, 25%); // 比主 label 更淡
    text-transform: lowercase;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: nowrap;
  }
}

// ── port tooltip（Teleport 到 body，scoped 在 Vue3 下仍生效） ──
.port-tooltip {
  position: fixed;
  z-index: 3000;
  min-width: 120px;
  max-width: 240px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #1f2937;
  color: #f3f4f6;
  font-size: 11px;
  line-height: 1.5;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  pointer-events: none;  // 鼠标不会卡在气泡上，移出圆点立即消失
  user-select: none;

  // 气泡上方的小三角（默认气泡在圆点上方）
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -4px;
    transform: translateX(-50%);
    border-width: 4px 4px 0;
    border-style: solid;
    border-color: #1f2937 transparent transparent transparent;
  }

  // 翻转后三角到上方
  &--flipped::after {
    top: -4px;
    bottom: auto;
    border-width: 0 4px 4px;
    border-color: transparent transparent #1f2937 transparent;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  }

  &__side {
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
    line-height: 1.4;
  }

  &__name {
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__values {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__value {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #e5e7eb;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__empty {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
  }

  // 图片预览网格：多值端口 2 列小图，单值端口 1 张大图
  &__images {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    margin-bottom: 4px;

    &--single {
      grid-template-columns: 1fr;
    }
  }

  &__thumb {
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: center;

    img {
      width: 100%;
      height: 80px;
      object-fit: cover;
      border-radius: 4px;
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: block;

      .port-tooltip__images--single & {
        height: 120px;
      }
    }
  }

  &__thumb-name {
    font-size: 9px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: rgba(255, 255, 255, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    text-align: center;
  }
}
</style>
