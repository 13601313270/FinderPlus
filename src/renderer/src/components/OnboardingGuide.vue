<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOnboarding } from '@renderer/composables/useOnboarding'

/**
 * 新手引导覆盖层：
 * - 全屏半透明遮罩，pointer-events: none，**不阻断**画布交互
 * - 右上角浮动步骤卡片（pointer-events: auto，可点"跳过"）
 * - Step 1：画布区域显示虚线框提示"拖文件到这里"
 * - Step 2：调色板按钮附近显示虚线框提示"从这里添加 File Info 节点"
 *
 * 遮罩不做「挖洞」 spotlight——直接让画布区半透明 + 虚线高亮，足够用户知道在哪操作，
 * 同时保持画布完全可交互。
 */
const { t } = useI18n()
const { active, step, skip } = useOnboarding()

const currentStep = computed(() => step.value)

function onSkip(): void {
  skip()
}
</script>

<template>
  <div v-if="active" class="guide">
    <!-- 半透明遮罩：pointer-events: none → 事件穿透到下层画布 -->
    <div class="guide__overlay" />

    <!-- Step 1：画布区域高亮（提示"拖文件到这里"） -->
    <div v-if="currentStep === 0" class="guide__canvas-hint">
      <div class="guide__canvas-hint-box" />
      <p class="guide__canvas-hint-text">
        <span class="guide__arrow">↓</span>
        {{ t('onboarding.step1.canvasLabel') }}
      </p>
    </div>

    <!-- Step 2：调色板按钮高亮（提示"从这里添加 File Info"） -->
    <div v-else class="guide__palette-hint">
      <div class="guide__palette-hint-box" />
      <p class="guide__palette-hint-text">
        <span class="guide__arrow">→</span>
        {{ t('onboarding.step2.paletteLabel') }}
      </p>
    </div>

    <!-- 右上角步骤卡片：pointer-events: auto → 可交互 -->
    <div class="guide__card">
      <header class="guide__card-header">
        <span class="guide__step-badge">
          {{ currentStep + 1 }} / 2
        </span>
        <h2 class="guide__title">{{ t('onboarding.title') }}</h2>
      </header>

      <section class="guide__card-body">
        <h3 class="guide__step-title">
          {{ currentStep === 0 ? t('onboarding.step1.title') : t('onboarding.step2.title') }}
        </h3>
        <p class="guide__step-hint">
          {{ currentStep === 0 ? t('onboarding.step1.hint') : t('onboarding.step2.hint') }}
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
    // 画布占满 dragbar 以下区域（dragbar 高 30px），定位时从 .stage__stage__dragbar 下方开始
    position: absolute;
    top: 42px; // dragbar 30px + 12px 内边距，留点空间
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
    // 发光效果让虚线框在半透明遮罩下跳出来
    box-shadow:
      0 0 0 4px rgba(255, 255, 255, 0.15),
      0 0 40px rgba(255, 255, 255, 0.2);
    animation: guide-dash-pulse 1.6s ease-in-out infinite;
  }

  // —— Step 2 调色板按钮高亮 ——
  &__palette-hint {
    position: absolute;
    top: 50px; // 调色板按钮 top: 12px，高 34px → 中心约在 29px
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

  &__canvas-hint-text,
  &__palette-hint-text {
    pointer-events: none;
    margin: 0;
    padding: 6px 14px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.65);
    color: #fff;
    font-size: 14px;
    line-height: 1.4;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }

  &__arrow {
    font-weight: 700;
    font-size: 16px;
  }

  // —— 步骤卡片：右上角浮动 ——
  &__card {
    position: absolute;
    top: 52px;
    right: 20px;
    width: 320px;
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
</style>
