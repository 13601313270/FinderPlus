<script setup lang="ts">
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { helpMessages } from './help.i18n'

/**
 * 文本输入节点帮助正文。文案全部来自 help.i18n.ts（9 语言），跟随界面语言渲染。
 * 带行内 <code> / <b> 的句子用 v-html；代码块结构留在模板里，只把注释抽成词条。
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

    <!-- 节点设置 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('configTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('configLi1')"></li>
        <li v-html="t('configLi2')"></li>
      </ul>
    </section>

    <!-- 端口 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('portsTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('portsLi1')"></li>
        <li v-html="t('portsLi2')"></li>
        <li v-html="t('portsLi3')"></li>
      </ul>
    </section>

    <!-- 编辑与发送 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('runTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('runLi1')"></li>
        <li v-html="t('runLi2')"></li>
        <li v-html="t('runLi3')"></li>
        <li v-html="t('runLi4')"></li>
      </ul>
    </section>

    <!-- 输出 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('outputTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('outputLi1')"></li>
        <li>{{ t('outputLi2') }}</li>
      </ul>
    </section>

    <!-- 注意事项 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('notesTitle') }}</h4>
      <ul class="help-list">
        <li>{{ t('notesLi1') }}</li>
        <li>{{ t('notesLi2') }}</li>
        <li>{{ t('notesLi3') }}</li>
      </ul>
    </section>

    <!-- 示例 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('exampleTitle') }}</h4>
      <div class="help-example">
        <div class="help-example__label" v-html="t('exampleLabel')"></div>
        <pre class="help-code"><code><span class="c-comment">{{ t('exampleComment1') }}</span>
Hello, world!

<span class="c-comment">{{ t('exampleComment2') }}</span>
<span class="c-val">text</span> = "Hello, world!"</code></pre>
      </div>
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

.help-code {
  margin: 8px 0;
  padding: 10px 12px;
  background: #1e293b;
  border-radius: 6px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  line-height: 1.6;

  code {
    color: #e2e8f0;
    background: none;
    padding: 0;
  }

  .c-comment { color: #94a3b8; font-style: italic; }
  .c-val     { color: #fde68a; }
}

.help-example {
  &__label {
    font-size: 11px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 2px;

    :deep(code) {
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 3px;
    }
  }
}
</style>