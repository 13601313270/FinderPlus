<script setup lang="ts">import { computed, ref } from 'vue';
import { nodeManifests } from '../../../main/nodePlugin';
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
// 下拉项文案：先用 type 字符串，后续可在 manifest 里加 displayName
const items = computed(() => nodeManifests.map((m) => ({
 type: m.type,
 label: m.type
})));
</script>

<template>
  <div
    class="palette"
    :class="{ 'palette--open': expanded }"
    @mouseenter="openMenu"
    @mouseleave="scheduleClose"
  >
    <button class="palette__trigger" type="button" title="添加节点">＋</button>

    <transition name="palette-fade">
      <ul v-if="expanded" class="palette__menu">
        <li
          v-for="item in items"
          :key="item.type"
          class="palette__item"
          @click.stop="onSelectType(item.type)"
        >
          {{ item.label }}
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
    padding: 8px 14px;
    font-size: 13px;
    color: @color-text;
    cursor: pointer;
    transition: background 0.1s ease;

    &:hover {
      background: #eef1f5;
      color: @color-primary;
    }
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
