<script setup lang="ts">
/**
 * PdfFileValue 渲染器：PDF 缩略图（首页）+ 文件名。
 * 当前版本用文件类型 emoji + 文件名兜底；未来可接 pdf.js 做首页渲染。
 *
 * 架构上先占住位置——satisfies BuiltinRendererMap 强制注册了它，
 * 未来改内部实现不用回头改 index.ts，也不会触发 typecheck 报错。
 */
defineProps<{
  value: { file?: File; displayLabel: string }
  context?: 'tooltip' | 'detail' | 'inline'
}>()
</script>

<template>
  <div class="v-pdf" :class="{ 'v-pdf--detail': context === 'detail' }">
    <div class="v-pdf__icon">📄</div>
    <div class="v-pdf__name">{{ value.displayLabel }}</div>
  </div>
</template>

<style scoped lang="less">
.v-pdf {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;

  &__icon {
    width: 100%;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);

    .v-pdf--detail & {
      height: 200px;
      font-size: 56px;
    }
  }

  &__name {
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: rgba(255, 255, 255, 0.7);
    word-break: break-all;
    text-align: center;
  }
}
</style>
