<script setup lang="ts">
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { helpMessages } from './help.i18n'

/**
 * HTTP 请求节点帮助正文。文案全部来自 help.i18n.ts（9 语言），跟随界面语言渲染。
 * 带行内 <code> / <b> 的句子用 v-html；代码块结构、HTTP 方法列表、URL 示例、
 * 端口标签留在模板里，只把其中的注释抽成词条。
 */
const t = useLocalizedMessages(helpMessages)
</script>

<template>
  <div class="help-body">
    <!-- 什么是 HTTP 请求节点 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('whatTitle') }}</h4>
      <p class="help-section__p" v-html="t('whatBody')"></p>
    </section>

    <!-- 展开 / 收起 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('expandTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('expandLi1')"></li>
        <li v-html="t('expandLi2')"></li>
        <li v-html="t('expandLi3')"></li>
        <li>{{ t('expandLi4') }}</li>
      </ul>
    </section>

    <!-- 输入端口与 $N 模板 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('portsTitle') }}</h4>
      <p class="help-section__p" v-html="t('portsLead')"></p>
      <ul class="help-list">
        <li v-html="t('portsLi1')"></li>
        <li v-html="t('portsLi2')"></li>
        <li v-html="t('portsLi3')"></li>
        <li v-html="t('portsLi4')"></li>
        <li v-html="t('portsLi5')"></li>
      </ul>
      <div class="help-example">
        <div class="help-example__label">{{ t('portsExampleLabel') }}</div>
        <pre class="help-code"><code><span class="c-comment">{{ t('portsComment1') }}</span>
https://api.example.com/users/<span class="c-val">$1</span>

<span class="c-comment">{{ t('portsComment2') }}</span>
Authorization: Bearer <span class="c-val">$2</span></code></pre>
      </div>
    </section>

    <!-- 方法 / Headers / Body / 超时 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('configTitle') }}</h4>
      <table class="help-table">
        <thead><tr><th>{{ t('tblHeaderItem') }}</th><th>{{ t('tblHeaderDesc') }}</th></tr></thead>
        <tbody>
          <tr>
            <td v-html="t('tblMethodLabel')"></td>
            <td><code>GET</code> / <code>POST</code> / <code>PUT</code> / <code>DELETE</code> / <code>PATCH</code> / <code>HEAD</code></td>
          </tr>
          <tr>
            <td v-html="t('tblHeadersLabel')"></td>
            <td v-html="t('tblHeadersDesc')"></td>
          </tr>
          <tr>
            <td v-html="t('tblBodyLabel')"></td>
            <td v-html="t('tblBodyDesc')"></td>
          </tr>
          <tr>
            <td v-html="t('tblTimeoutLabel')"></td>
            <td v-html="t('tblTimeoutDesc')"></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 执行与结果 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('execTitle') }}</h4>
      <ul class="help-list">
        <li>{{ t('execLi1') }}</li>
        <li>{{ t('execLi2') }}</li>
        <li v-html="t('execLi3')"></li>
        <li v-html="t('execLi4')"></li>
        <li v-html="t('execLi5')"></li>
      </ul>
      <p class="help-section__p help-section__p--warn" v-html="t('execWarn')"></p>
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

    &--warn {
      margin-top: 8px;
      padding: 8px 10px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      color: #92400e;
      font-size: 11px;

      :deep(code) {
        color: #b45309;
        background: #fef3c7;
      }
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
  }

  th {
    font-weight: 600;
    color: #374151;
    background: #f9fafb;
    font-size: 11px;
  }

  td {
    color: #4b5563;

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
  }

  + & {
    margin-top: 4px;
  }
}
</style>