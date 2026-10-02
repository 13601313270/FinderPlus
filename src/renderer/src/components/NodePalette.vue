<script setup lang="ts">import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { paletteManifests } from '../../../main/nodePlugin';
import { resolveNodeTitle } from '../../../main/nodePlugin/manifest';
import { useLanguageSettings } from '@renderer/composables/useLanguageSettings';
/**
 * 节点调色板：画布左上角的「＋」按钮。
 *
 * 交互流程：
 * 1. 鼠标悬浮按钮（或点击）→ 下拉展开，列出所有可添加的节点类型；
 * 2. 点击某一类型 → emit('select-type', type)，由父组件构造节点并进入「跟随鼠标」状态；
 * 3. 下拉在选择 / 鼠标离开后自动收起。
 *
 * 设计成纯 UI 组件：不碰 Scene、不构造节点，只把「用户想加什么类型」告诉上层。
 */
const { t } = useI18n();
const { language } = useLanguageSettings();
const emit = defineEmits<{
 (e: 'select-type', type: string): void;
}>();
const expanded = ref(false);
let closeTimer: ReturnType<typeof setTimeout> | undefined;
function openMenu(): void {
 if (closeTimer) {
 clearTimeout(closeTimer);
 closeTimer = undefined;
 }
 expanded.value = true;
}
function scheduleClose(): void {
 if (closeTimer)
 clearTimeout(closeTimer);
 // 给用户留出从按钮滑向下拉的时间，别一离开按钮就收
 closeTimer = setTimeout(() => {
 expanded.value = false;
 closeTimer = undefined;
 }, 150);
}
function onSelectType(type: string): void {
 expanded.value = false;
 emit('select-type', type);
}
// 下拉项文案取自各个插件 manifest 自己声明的多语言 title；
// 插件没配当前语言时由 resolveNodeTitle 兜底（en → zh → 已配的第一种 → type）。
// 这样新增/第三方插件不用改 Finder+ 的中央词条表就能带上自己的显示名。
// 图标同理：manifest.iconPaths 由插件自己声明，缺省时列表项只显示文字。
const items = computed(() => paletteManifests.map((m) => ({
 type: m.type,
 label: resolveNodeTitle(m, language.value),
 iconPaths: m.iconPaths ?? []
})));
</script>

<template>
  <div
    class="palette"
    :class="{ 'palette--open': expanded }"
    @mouseenter="openMenu"
    @mouseleave="scheduleClose"
  >
    <button class="palette__trigger" type="button" :title="t('palette.addNode')">＋</button>

    <transition name="palette-fade">
      <ul v-if="expanded" class="palette__menu">
        <li
          v-for="item in items"
          :key="item.type"
          class="palette__item"
          @click.stop="onSelectType(item.type)"
        >
          <svg
            v-if="item.iconPaths.length"
            class="palette__icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path v-for="(d, i) in item.iconPaths" :key="i" :d="d" />
          </svg>
          <span class="palette__label">{{ item.label }}</span>
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped lang="less">
.palette {
  // 画布左上角浮层：屏幕层，不吃世界缩放，也不被节点/连线盖住
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 20;
  user-select: none;

  &__trigger {
    width: 34px;
    height: 34px;
    padding: 0;
    border: 1px solid #d5d9e0;
    border-radius: 8px;
    background: @color-surface;
    color: @color-text;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
      background: #eef1f5;
      border-color: @color-primary;
      color: @color-primary;
    }
  }

  &__menu {
    position: absolute;
    top: 40px; // 紧贴 trigger 下方
    left: 0;
    min-width: 160px;
    margin: 0;
    padding: 4px 0;
    list-style: none;
    border: 1px solid #d5d9e0;
    border-radius: 8px;
    background: @color-surface;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    overflow: hidden;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    font-size: 13px;
    color: @color-text;
    cursor: pointer;
    transition: background 0.1s ease;

    &:hover {
      background: #eef1f5;
      color: @color-primary;

      .palette__icon {
        color: @color-primary;
      }
    }
  }

  &__icon {
    flex: 0 0 auto;
    color: #8a919c;
    transition: color 0.1s ease;
  }

  &__label {
    white-space: nowrap;
  }
}

.palette-fade-enter-active,
.palette-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.palette-fade-enter-from,
.palette-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
