<script setup lang="ts">
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { helpMessages } from './help.i18n'

/**
 * Code 节点帮助正文。文案全部来自 help.i18n.ts（9 语言），跟随界面语言渲染。
 * 带行内 <code> / <b> 的句子用 v-html；代码块结构留在模板里，只把注释/占位符抽成词条。
 */
const t = useLocalizedMessages(helpMessages)
</script>

<template>
  <div class="help-body">
    <!-- 什么是代码节点 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('whatTitle') }}</h4>
      <p class="help-section__p" v-html="t('whatBody')"></p>
    </section>

    <!-- 输入端口 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('inputsTitle') }}</h4>
      <p class="help-section__p" v-html="t('inputsLead')"></p>
      <ul class="help-list">
        <li v-html="t('inputsLiVarName')"></li>
        <li v-html="t('inputsLiType')"></li>
      </ul>
      <table class="help-table">
        <thead><tr><th>{{ t('tblHeaderType') }}</th><th>{{ t('tblHeaderGot') }}</th></tr></thead>
        <tbody>
          <tr><td><code>number</code></td><td v-html="t('tblNumber')"></td></tr>
          <tr><td><code>string</code></td><td v-html="t('tblString')"></td></tr>
          <tr><td><code>bool</code></td><td v-html="t('tblBool')"></td></tr>
          <tr><td><code>file</code></td><td v-html="t('tblFile')"></td></tr>
        </tbody>
      </table>
    </section>

    <!-- 输出端口 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('outputsTitle') }}</h4>
      <p class="help-section__p" v-html="t('outputsLead')"></p>
      <ul class="help-list">
        <li v-html="t('outputsLiPortName')"></li>
        <li v-html="t('outputsLiType')"></li>
      </ul>
    </section>

    <!-- callOutputPort 语法 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('callTitle') }}</h4>
      <pre class="help-code"><code>callOutputPort(<span class="c-str">{{ t('snippetPortName') }}</span>, <span class="c-val">{{ t('snippetValue') }}</span>)</code></pre>
      <p class="help-section__p">{{ t('callNote') }}</p>
    </section>

    <!-- 示例 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('examplesTitle') }}</h4>

      <div class="help-example">
        <div class="help-example__label">{{ t('ex1Label') }}</div>
        <pre class="help-code"><code><span class="c-comment">{{ t('ex1Comment1') }}</span>
<span class="c-comment">{{ t('ex1Comment2') }}</span>
<span class="c-func">callOutputPort</span>(<span class="c-str">"result"</span>, price <span class="c-op">*</span> qty)</code></pre>
      </div>

      <div class="help-example">
        <div class="help-example__label">{{ t('ex2Label') }}</div>
        <pre class="help-code"><code><span class="c-comment">{{ t('ex1Comment2') }}</span>
[<span class="c-num">1</span>, <span class="c-num">2</span>, <span class="c-num">3</span>, <span class="c-num">4</span>].forEach(<span class="c-ident">v</span> <span class="c-op">=></span> {
  <span class="c-func">callOutputPort</span>(<span class="c-str">"port1"</span>, v)
  <span class="c-func">callOutputPort</span>(<span class="c-str">"port2"</span>, String(v))
})</code></pre>
      </div>

      <div class="help-example">
        <div class="help-example__label">{{ t('ex3Label') }}</div>
        <pre class="help-code"><code><span class="c-comment">{{ t('ex1Comment2') }}</span>
<span class="c-kw">return</span> [<span class="c-num">1</span>, <span class="c-num">2</span>, <span class="c-num">3</span>].<span class="c-func">reduce</span>((<span class="c-ident">a</span>, <span class="c-ident">b</span>) <span class="c-op">=></span> a <span class="c-op">+</span> b, <span class="c-num">0</span>)</code></pre>
      </div>

      <div class="help-example">
        <div class="help-example__label">{{ t('ex4Label') }}</div>
        <pre class="help-code"><code><span class="c-comment">{{ t('ex4Comment1') }}</span>
<span class="c-comment">{{ t('ex4Comment2') }}</span>
<span class="c-func">callOutputPort</span>(<span class="c-str">"name"</span>, f.name)
<span class="c-func">callOutputPort</span>(<span class="c-str">"size"</span>, f.size)</code></pre>
      </div>
    </section>

    <!-- 异步说明 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('asyncTitle') }}</h4>
      <p class="help-section__p" v-html="t('asyncBody')"></p>

      <div class="help-example">
        <div class="help-example__label">{{ t('asyncEx1Label') }}</div>
        <pre class="help-code"><code><span class="c-func">callOutputPort</span>(<span class="c-str">"result"</span>, <span class="c-str">"11a"</span>)
<span class="c-kw">await</span> <span class="c-func">new</span> Promise(resolve <span class="c-op">=></span> <span class="c-func">setTimeout</span>(resolve, <span class="c-num">1000</span>))
<span class="c-func">callOutputPort</span>(<span class="c-str">"port2"</span>, <span class="c-str">"22b"</span>) <span class="c-comment">{{ t('asyncEx1Comment') }}</span></code></pre>
      </div>

      <div class="help-example">
        <div class="help-example__label">{{ t('asyncEx2Label') }}</div>
        <pre class="help-code"><code><span class="c-func">callOutputPort</span>(<span class="c-str">"result"</span>, <span class="c-str">"11"</span>)
<span class="c-func">setTimeout</span>(() <span class="c-op">=></span> {
  <span class="c-func">callOutputPort</span>(<span class="c-str">"port2"</span>, <span class="c-str">"33"</span>) <span class="c-comment">{{ t('asyncEx2Comment1') }}</span>
}, <span class="c-num">1000</span>)
<span class="c-func">callOutputPort</span>(<span class="c-str">"port2"</span>, <span class="c-str">"22"</span>) <span class="c-comment">{{ t('asyncEx2Comment2') }}</span></code></pre>
      </div>

      <p class="help-section__p help-section__p--warn" v-html="t('asyncWarn')"></p>
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
  .c-str     { color: #86efac; }
  .c-val     { color: #fde68a; }
  .c-num     { color: #fbbf24; }
  .c-func    { color: #60a5fa; }
  .c-kw      { color: #f472b6; font-weight: 500; }
  .c-ident   { color: #e2e8f0; }
  .c-op      { color: #94a3b8; }
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