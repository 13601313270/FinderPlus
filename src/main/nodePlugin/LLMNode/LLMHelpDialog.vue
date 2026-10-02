<script setup lang="ts">
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { helpMessages } from './help.i18n'

/**
 * LLM 节点帮助正文。文案全部来自 help.i18n.ts（9 语言），跟随界面语言渲染。
 * 带行内 <code> / <b> 的句子用 v-html；端口名等与语言无关的代码留在模板里。
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

    <!-- 模型与 Provider 配置 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('configTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('configLi1')"></li>
        <li v-html="t('configLi2')"></li>
        <li v-html="t('configLi3')"></li>
        <li v-html="t('configLi4')"></li>
      </ul>
    </section>

    <!-- 端口一览 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('portsTitle') }}</h4>
      <p class="help-section__p" v-html="t('portsLead')"></p>
      <table class="help-table">
        <thead>
          <tr>
            <th>{{ t('tblHeaderPort') }}</th>
            <th>{{ t('tblHeaderDir') }}</th>
            <th>{{ t('tblHeaderDesc') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>system</code></td>
            <td>{{ t('dirIn') }}</td>
            <td v-html="t('tblSystemDesc')"></td>
          </tr>
          <tr>
            <td><code>prompt</code></td>
            <td>{{ t('dirIn') }}</td>
            <td v-html="t('tblPromptDesc')"></td>
          </tr>
          <tr>
            <td><code>text</code></td>
            <td>{{ t('dirOut') }}</td>
            <td v-html="t('tblTextDesc')"></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 执行与状态 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('runTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('runLi1')"></li>
        <li v-html="t('runLi2')"></li>
        <li v-html="t('runLi3')"></li>
        <li v-html="t('runLi4')"></li>
        <li v-html="t('runLi5')"></li>
      </ul>
    </section>

    <!-- 注意事项 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('notesTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('notesLi1')"></li>
        <li v-html="t('notesLi2')"></li>
        <li v-html="t('notesLi3')"></li>
        <li v-html="t('notesLi4')"></li>
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
  margin: 6px 0 0;
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

.help-table {
  width: 100%;
  margin-top: 8px;
  border-collapse: collapse;
  font-size: 12px;

  th, td {
    padding: 6px 10px;
    text-align: left;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }

  th {
    font-weight: 600;
    color: #374151;
    background: #f9fafb;
    font-size: 11px;
  }

  td {
    color: #4b5563;
    line-height: 1.6;

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