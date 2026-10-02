<script setup lang="ts">
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { helpMessages } from './help.i18n'

/**
 * 布尔输入节点帮助正文。文案全部来自 help.i18n.ts（9 语言），跟随界面语言渲染。
 * 带行内 <code> / <b> 的句子用 v-html；纯文字句子用 {{ }} 插值。
 */
const t = useLocalizedMessages(helpMessages)
</script>

<template>
  <div class="help-body">
    <!-- 这是什么 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('whatTitle') }}</h4>
      <p class="help-section__p" v-html="t('whatBody')"></p>
    </section>

    <!-- 怎么用 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('useTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('useLi1')"></li>
        <li v-html="t('useLi2')"></li>
      </ul>
    </section>

    <!-- 输出端口 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('portsTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('portsLi1')"></li>
        <li v-html="t('portsLi2')"></li>
      </ul>
    </section>

    <!-- 注意事项 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('notesTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('notesLi1')"></li>
        <li v-html="t('notesLi2')"></li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="less">
.help-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.help-section {
  &__title {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
    padding-bottom: 6px;
    border-bottom: 1px solid #f3f4f6;
  }

  &__p {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: #4b5563;

    /* v-html 注入的节点没有 scope 属性，用 :deep 让行内 code / b 命中样式 */
    :deep(code) {
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 3px;
    }

    :deep(b) {
      color: #1f2937;
    }
  }
}

.help-list {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.7;
  color: #4b5563;

  li {
    :deep(code) {
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 3px;
    }

    :deep(b) {
      color: #1f2937;
    }
  }
}
</style>