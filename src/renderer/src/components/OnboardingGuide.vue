<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOnboarding } from '@renderer/composables/useOnboarding'
import { getCanvasContainer, viewport } from '@renderer/canvas/viewport'
import { workspaceScene } from '../../../main/engine/graph/SceneRegistry'
import { FileNode } from '../../../main/nodePlugin/FileNode/node'
import { FileInfoNode } from '../../../main/nodePlugin/FileInfoNode/node'

const onboarding = useOnboarding()

/** 庆祝提示的自动淡出 timer——引导完成后 2.5s 自动关闭 */
let celebrationTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => onboarding.celebration.value,
  (show) => {
    if (celebrationTimer) {
      clearTimeout(celebrationTimer)
      celebrationTimer = null
    }
    if (show) {
      // celebrationTimer = setTimeout(() => {
      //   onboarding.dismissCelebration()
      // }, 2500)
    }
  }
)

onBeforeUnmount(() => {
  if (celebrationTimer) {
    clearTimeout(celebrationTimer)
    celebrationTimer = null
  }
})

/**
 * 自己从 DOM 检测调色板展开状态——不依赖 NodePalette 给引导注入状态。
 * NodePalette 展开时根元素有 `.palette--open` class，收起时没有。
 * 用 MutationObserver 监听 document 的 class 变化，零延迟、零空闲消耗。
 */
const paletteOpenLocal = ref(false)
let paletteObserver: MutationObserver | null = null

function detectPaletteOpen(): boolean {
  return document.querySelector('.palette.palette--open') !== null
}

onMounted(() => {
  paletteOpenLocal.value = detectPaletteOpen()
  paletteObserver = new MutationObserver(() => {
    paletteOpenLocal.value = detectPaletteOpen()
  })
  paletteObserver.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ['class']
  })
})

onBeforeUnmount(() => {
  paletteObserver?.disconnect()
  paletteObserver = null
})

/**
 * 端口 + 调色板瓦片高亮的 DOM 操作（不污染通用组件）：
 * - step===1 且 paletteOpen===true：给 file-info 瓦片加 class
 * - step===3：给 FileNode 的 file 输出端口 + FileInfoNode 的 file 输入端口加 class
 * - 其他情况：清掉所有引导高亮 class
 */
function syncOnboardingHighlight(step: number): void {
  // 引导关闭中（active=false）→ 直接清干净就走，不再按 step 加任何高亮
  if (!onboarding.active.value || step < 0) {
    document.querySelectorAll('.port.port--onboarding-target').forEach((el) => {
      el.classList.remove('port--onboarding-target')
    })
    document.querySelectorAll('.palette__item.palette__item--highlight').forEach((el) => {
      el.classList.remove('palette__item--highlight')
    })
    return
  }

  // 先清掉旧的（兜底）
  document.querySelectorAll('.port.port--onboarding-target').forEach((el) => {
    el.classList.remove('port--onboarding-target')
  })
  document.querySelectorAll('.palette__item.palette__item--highlight').forEach((el) => {
    el.classList.remove('palette__item--highlight')
  })

  if (step === 1 && paletteOpenLocal.value) {
    // Step 2a：等调色板展开后高亮 file-info 瓦片
    document.querySelectorAll('.palette__item[data-item-type="file-info"]').forEach((el) => {
      el.classList.add('palette__item--highlight')
    })
  } else if (step === 3) {
    // Step 3：连线阶段高亮目标端口
    for (const node of workspaceScene.allNodes) {
      if (node instanceof FileNode && !(node instanceof FileInfoNode)) {
        document.querySelectorAll(
          `[data-node-type="${node.type}"] .ports-col--right .port[data-port-id="file"]`
        ).forEach((el) => el.classList.add('port--onboarding-target'))
      } else if (node instanceof FileInfoNode) {
        document.querySelectorAll(
          `[data-node-type="${node.type}"] .ports-col--left .port[data-port-id="file"]`
        ).forEach((el) => el.classList.add('port--onboarding-target'))
      }
    }
  }
}

watch(
  () => onboarding.step.value,
  (s) => { nextTick(() => syncOnboardingHighlight(s)) }
)
watch(
  paletteOpenLocal,
  () => { nextTick(() => syncOnboardingHighlight(onboarding.step.value)) }
)
watch(
  () => onboarding.active.value,
  (active) => { if (!active) nextTick(() => syncOnboardingHighlight(-1)) }
)

/**
 * 新手引导覆盖层：
 * - 全屏半透明遮罩，pointer-events: none，**不阻断**画布交互
 * - 画布顶部居中浮动步骤卡片（pointer-events: auto，可点"跳过"）
 * - 三态切换：
 *   step 0 → Step 1：画布区域虚线框 + canvasLabel 提示"拖文件到这里"
 *   step 1 → Step 2a：调色板按钮虚线框 + paletteLabel 提示"打开调色板搜索 File Info"
 *   step 2 → Step 2b：画布中央浮动提示条 + connectLabel 提示"从文件节点右侧圆点拖线到 File Info 左侧圆点"
 *
 * 遮罩不做「挖洞」 spotlight——半透明 + 高亮框，足够用户知道在哪操作，同时保持画布完全可交互。
 */
const { t } = useI18n()
const { active, step, skip } = useOnboarding()

const currentStep = computed(() => step.value)

/**
 * 蒙层要不要显示：
 * - Step 0（拖文件）：显示
 * - Step 1（等调色板）：调色板没展开时显示（引导 hover 按钮），展开后隐藏（菜单要看清）
 * - Step 2（放置节点）：隐藏——节点要跟随鼠标移动，画布不能盖
 * - Step 3（连线）：隐藏——节点端口要明晃晃才能看清并拖线
 */
const showOverlay = computed(() => {
  if (currentStep.value === 0) return true
  if (currentStep.value === 1) return !paletteOpenLocal.value
  return false // step 2/3 都不盖
})

/** 根据 step 返回当前步骤卡的 title / hint 词条路径前缀 */
const currentStepKeys = computed(() => {
  if (currentStep.value === 0) return { title: 'onboarding.step1.title', hint: 'onboarding.step1.hint' }
  if (currentStep.value === 1) return { title: 'onboarding.step2a.title', hint: 'onboarding.step2a.hint' }
  if (currentStep.value === 2) return { title: 'onboarding.step2b.title', hint: 'onboarding.step2b.hint' }
  return { title: 'onboarding.step3.title', hint: 'onboarding.step3.hint' }
})

function onSkip(): void {
  skip()
}

/**
 * 24 片彩色小纸片的随机样式（位置、颜色、延迟）。
 * 每次渲染都会随机，但 Vue 的 key 固定所以不会抖动——
 * 只有 celebration 重新 true→false→true 时才会重新生成。
 */
const CONFETTI_COLORS = ['#ff3b30', '#3366ff', '#ff9500', '#30d158', '#bf5af2', '#00c7be', '#ff6482']
function confettiStyle(i: number): Record<string, string> {
  const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
  const left = (i * 37 + 13) % 100 // 0-99 伪随机，不依赖 Math.random 避免 SSR 不一致
  const delay = ((i * 7) % 12) * 0.05 // 0-0.55s
  const duration = 1.4 + ((i * 3) % 8) * 0.15 // 1.4-2.45s
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    backgroundColor: color
  }
}

/**
 * Step 2b 时，File Info 节点应该放在 FileNode 的**右边**（方便后面从 FileNode 往右拉 Edge）。
 * 这个 computed 算出「目标放置位置」在屏幕上的红框位置（fixed 定位坐标）。
 *
 * 世界坐标 → 屏幕坐标：
 *   screenX = worldX * scale + viewport.x + canvasRect.left
 *   screenY = worldY * scale + viewport.y + canvasRect.top
 */
const placementHintBox = computed(() => {
  if (currentStep.value !== 2) return null
  // 读 allNodes 建立依赖，确保节点位置变化时重算
  const allNodes = workspaceScene.allNodes
  const fileNode = allNodes.find((n) => n instanceof FileNode)
  if (!fileNode) return null

  const canvasEl = getCanvasContainer()
  if (!canvasEl) return null
  const canvasRect = canvasEl.getBoundingClientRect()

  const [wx, wy] = fileNode.worldPosition
  const [w, h] = fileNode.box
  const scale = viewport.scale

  // File Info 目标区域：FileNode 右边缘往右 80px（世界），大小 240×140（世界，与 FileInfoNode 相当）
  const GAP_WORLD = 80
  const TARGET_W_WORLD = 240
  const TARGET_H_WORLD = 140

  const targetWorldX = wx + w + GAP_WORLD
  const targetWorldY = wy + h / 2 - TARGET_H_WORLD / 2

  return {
    left: targetWorldX * scale + viewport.x + canvasRect.left,
    top: targetWorldY * scale + viewport.y + canvasRect.top,
    width: TARGET_W_WORLD * scale,
    height: TARGET_H_WORLD * scale
  }
})
</script>

<template>
  <div v-if="active" class="guide">
    <!-- 半透明遮罩：
         - Step 0：始终显示（引导拖文件进画布）
         - Step 1：调色板未展开时显示（引导 hover 按钮），展开后隐藏（菜单要看清）
         - Step 2：始终显示 -->
    <div v-if="showOverlay" class="guide__overlay" />

    <!-- Step 1：画布区域虚线高亮 -->
    <div v-if="currentStep === 0" class="guide__canvas-hint">
      <div class="guide__canvas-hint-box" />
      <p class="guide__floating-tip">
        <span class="guide__arrow">↓</span>
        {{ t('onboarding.step1.canvasLabel') }}
      </p>
    </div>

    <!-- Step 2a：调色板按钮虚线高亮（调色板已展开则由 NodePalette 内部高亮 file-info 瓦片） -->
    <div v-else-if="currentStep === 1" class="guide__palette-hint">
      <div class="guide__palette-hint-box" />
      <p class="guide__floating-tip">
        <span class="guide__arrow">→</span>
        {{ t('onboarding.step2a.paletteLabel') }}
      </p>
    </div>

    <!-- Step 2b：放置节点提示（用户刚选了 File Info，节点跟随鼠标中） + 目标放置区红框 -->
    <template v-else-if="currentStep === 2">
      <div class="guide__place-hint">
        <p class="guide__connect-tip">
          <span class="guide__arrow">👆</span>
          {{ t('onboarding.step2b.placeLabel') }}
        </p>
      </div>
      <!-- FileNode 右边的目标放置区红框（仅 FileNode 存在时渲染） -->
      <div
        v-if="placementHintBox"
        class="guide__placement-target"
        :style="{
          left: placementHintBox.left + 'px',
          top: placementHintBox.top + 'px',
          width: placementHintBox.width + 'px',
          height: placementHintBox.height + 'px'
        }"
      />
    </template>

    <!-- Step 3：画布中央连接提示条 -->
    <div v-else class="guide__connect-hint">
      <p class="guide__connect-tip">
        <span class="guide__arrow">↔</span>
        {{ t('onboarding.step3.connectLabel') }}
      </p>
    </div>

    <!-- 画布右上角步骤卡片：pointer-events: auto → 可交互 -->
    <div class="guide__card">
      <header class="guide__card-header">
        <span class="guide__step-badge">
          {{ currentStep + 1 }} / 4
        </span>
        <h2 class="guide__title">{{ t('onboarding.title') }}</h2>
      </header>

      <section class="guide__card-body">
        <h3 class="guide__step-title">
          {{ t(currentStepKeys.title) }}
        </h3>
        <p class="guide__step-hint">
          {{ t(currentStepKeys.hint) }}
        </p>
      </section>

      <footer class="guide__card-footer">
        <button
          class="guide__skip"
          type="button"
          @click="onSkip"
        >
          {{ t('onboarding.skip') }}
        </button>
      </footer>
    </div>
  </div>

  <!-- 引导完成后的庆祝提示：独立于 active，celebration=true 时弹出 -->
  <div v-if="onboarding.celebration.value" class="celebration">
    <div class="celebration__confetti" aria-hidden="true">
      <span
        v-for="i in 24"
        :key="i"
        class="celebration__piece"
        :style="confettiStyle(i)"
      />
    </div>
    <div class="celebration__card">
      <div class="celebration__emoji">🎉</div>
      <h2 class="celebration__title">{{ t('onboarding.celebration.title') }}</h2>
      <p class="celebration__desc">{{ t('onboarding.celebration.desc') }}</p>
      <button
        class="celebration__close"
        type="button"
        @click="onboarding.dismissCelebration()"
      >
        {{ t('onboarding.celebration.start') }} →
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.guide {
  // 覆盖层：全屏固定定位，不参与 App.vue 的 flex 布局，z-index 压在 Minimap 等浮层之上
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none; // 遮罩本身不拦事件

  &__overlay {
    position: absolute;
    inset: 0;
    background: rgba(20, 28, 42, 0.38);
    // backdrop-blur 让遮罩下的画布更模糊、引导文字更清晰，但保留足够的可见度让用户看清自己在做什么
    backdrop-filter: blur(1px);
  }

  // —— Step 1 画布区域虚线高亮 ——
  &__canvas-hint {
    // 画布占满 dragbar 以下区域（dragbar 高 30px）
    position: absolute;
    top: 42px;
    left: 12px;
    right: 12px;
    bottom: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  &__canvas-hint-box {
    width: 260px;
    height: 140px;
    border: 2px dashed #fff;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.12);
    box-shadow:
      0 0 0 4px rgba(255, 255, 255, 0.15),
      0 0 40px rgba(255, 255, 255, 0.2);
    animation: guide-dash-pulse 1.6s ease-in-out infinite;
  }

  // —— Step 2a 调色板按钮高亮 ——
  &__palette-hint {
    position: absolute;
    top: 50px; // 调色板按钮 top: 12px + dragbar 30px + padding
    left: 12px;
  }

  &__palette-hint-box {
    width: 34px;
    height: 34px;
    border: 2px dashed #fff;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.15);
    box-shadow:
      0 0 0 4px rgba(255, 255, 255, 0.15),
      0 0 30px rgba(255, 255, 255, 0.25);
    animation: guide-dash-pulse 1.6s ease-in-out infinite;
  }

  // —— Step 2b FileNode 右边目标放置区红框 ——
  &__placement-target {
    position: fixed;
    border: 2px dashed #ff3b30;
    border-radius: 12px;
    background: rgba(255, 59, 48, 0.08);
    box-shadow:
      0 0 0 4px rgba(255, 59, 48, 0.2),
      0 0 28px rgba(255, 59, 48, 0.35);
    animation: guide-placement-pulse 1.8s ease-in-out infinite;
    // 允许点击穿透到下层画布，不影响用户放置节点
    pointer-events: none;
    z-index: 1; // 比 guide__card 小，不挡住卡片
  }

  // —— Step 2b 放置节点提示：偏右下位置 ——
  &__place-hint {
    position: absolute;
    top: calc(50% + 120px);
    left: 65%;
    transform: translate(-50%, -50%);
  }

  // —— Step 3 画布中央连接提示 ——
  &__connect-hint {
    position: absolute;
    top: 300px;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  // 通用浮动提示条：黑色胶囊 + 白字
  &__floating-tip,
  &__connect-tip {
    pointer-events: none;
    margin: 0;
    padding: 8px 16px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font-size: 14px;
    line-height: 1.4;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
    white-space: nowrap;
  }

  &__connect-tip {
    // Step 2b 的连接提示字更长，允许换行
    white-space: normal;
    max-width: 420px;
    text-align: center;
    line-height: 1.6;
  }

  &__arrow {
    font-weight: 700;
    font-size: 16px;
  }

  // —— 步骤卡片：画布右上角 ——
  &__card {
    position: absolute;
    top: 42px;
    right: 12px;
    width: 360px;
    padding: 18px 20px 14px;
    border-radius: 12px;
    background: #fff;
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.18),
      0 2px 6px rgba(0, 0, 0, 0.1);
    pointer-events: auto; // 卡片内部恢复事件捕获，让"跳过"按钮可点
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  &__card-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__step-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    height: 22px;
    padding: 0 8px;
    border-radius: 11px;
    background: #3366ff;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: #1f2329;
  }

  &__card-body {
    padding: 8px 0;
  }

  &__step-title {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
    color: #1f2329;
  }

  &__step-hint {
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
    color: #5a6472;
  }

  &__card-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 4px;
    border-top: 1px solid #eef1f5;
  }

  &__skip {
    all: unset;
    cursor: pointer;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 13px;
    color: #5a6472;
    transition: background 0.15s ease, color 0.15s ease;

    &:hover {
      background: #f2f4f8;
      color: #1f2329;
    }
  }
}

// —— 引导完成庆祝提示 ——
.celebration {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000; // 比引导遮罩还高
  pointer-events: none; // 默认不拦事件

  &__card {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 380px;
    padding: 28px 28px 22px;
    border-radius: 16px;
    background: #fff;
    box-shadow:
      0 12px 48px rgba(0, 0, 0, 0.22),
      0 4px 14px rgba(0, 0, 0, 0.08);
    text-align: center;
    pointer-events: auto; // 卡片内部恢复事件
    animation: celebration-pop 0.45s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  &__emoji {
    font-size: 40px;
    line-height: 1;
    margin-bottom: 12px;
  }

  &__title {
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 600;
    color: #1f2329;
  }

  &__desc {
    margin: 0 0 18px;
    font-size: 13px;
    line-height: 1.6;
    color: #5a6472;
  }

  &__close {
    all: unset;
    cursor: pointer;
    padding: 8px 20px;
    border-radius: 8px;
    background: #3366ff;
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.15s ease, transform 0.1s ease;

    &:hover {
      background: #2955d9;
    }
    &:active {
      transform: scale(0.97);
    }
  }

  // —— 彩色小纸片下落 ——
  &__confetti {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  &__piece {
    position: absolute;
    top: -12px;
    width: 10px;
    height: 14px;
    border-radius: 2px;
    animation: confetti-fall linear forwards;
  }
}

@keyframes celebration-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, -46%) scale(0.85);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    transform: translateY(110vh) rotate(720deg);
    opacity: 0;
  }
}

/** 虚线框呼吸动画 */
@keyframes guide-dash-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.03);
    opacity: 1;
  }
}

/** 目标放置区红框呼吸动画 */
@keyframes guide-placement-pulse {
  0%, 100% {
    opacity: 0.85;
    box-shadow:
      0 0 0 4px rgba(255, 59, 48, 0.2),
      0 0 28px rgba(255, 59, 48, 0.35);
  }
  50% {
    opacity: 1;
    box-shadow:
      0 0 0 6px rgba(255, 59, 48, 0.12),
      0 0 40px rgba(255, 59, 48, 0.5);
  }
}
</style>

/**
 * 新手引导端口高亮的全局样式（不加 scoped）。
 * 由 OnboardingGuide 的 DOM 操作（document.querySelectorAll）把 class
 * `port--onboarding-target` 直接加到 NodePort 渲染的 DOM 元素上——
 * 这是引导专属的临时样式，引导结束时 class 会被移除，不影响正常使用。
 */
<style lang="less">
/**
 * 新手引导专属的全局样式（不加 scoped）。
 * 由 OnboardingGuide 的 DOM 操作（document.querySelectorAll）把 class
 * 直接加到 NodePort / NodePalette 渲染的 DOM 元素上——
 * 引导结束时 class 会被移除，不影响正常使用。
 */

// —— Step 2a：调色板 file-info 瓦片高亮 ——
.palette__item.palette__item--highlight {
  border-color: #ff3b30;
  border-width: 2px;
  box-shadow:
    0 0 0 3px rgba(255, 59, 48, 0.25),
    0 0 24px rgba(255, 59, 48, 0.4);
  animation: onboarding-tile-pulse 1.4s ease-in-out infinite;
  background: rgba(255, 59, 48, 0.08);
}

@keyframes onboarding-tile-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow:
      0 0 0 3px rgba(255, 59, 48, 0.25),
      0 0 24px rgba(255, 59, 48, 0.4);
  }
  50% {
    transform: scale(1.04);
    box-shadow:
      0 0 0 5px rgba(255, 59, 48, 0.15),
      0 0 36px rgba(255, 59, 48, 0.55);
  }
}

// —— Step 3：端口高亮 ——
.port.port--onboarding-target {
  border-color: #ff3b30;
  border-width: 3px;
  box-shadow:
    0 0 0 4px rgba(255, 59, 48, 0.3),
    0 0 20px rgba(255, 59, 48, 0.5);
  animation: onboarding-port-pulse 1.2s ease-in-out infinite;
}

@keyframes onboarding-port-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow:
      0 0 0 4px rgba(255, 59, 48, 0.3),
      0 0 20px rgba(255, 59, 48, 0.5);
  }
  50% {
    transform: scale(1.3);
    box-shadow:
      0 0 0 6px rgba(255, 59, 48, 0.15),
      0 0 32px rgba(255, 59, 48, 0.7);
  }
}
</style>
