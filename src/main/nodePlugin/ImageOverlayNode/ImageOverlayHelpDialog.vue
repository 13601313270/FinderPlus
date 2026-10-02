<script setup lang="ts">
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { helpMessages } from './help.i18n'

/**
 * 图片叠加节点帮助正文。文案全部来自 help.i18n.ts（9 语言），跟随界面语言渲染。
 * 带行内 <code> / <b> 的句子用 v-html；纯文字句子用 {{ }} 插值。
 */
const t = useLocalizedMessages(helpMessages)
</script>

<template>
  <div class="help-body">
    <!-- 什么是图片叠加节点 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('whatTitle') }}</h4>
      <p class="help-section__p" v-html="t('whatBody')"></p>
    </section>

    <!-- 输入端口 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('inputsTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('inputsLi1')"></li>
        <li v-html="t('inputsLi2')"></li>
        <li v-html="t('inputsLi3')"></li>
        <li v-html="t('inputsLi4')"></li>
        <li v-html="t('inputsLi5')"></li>
      </ul>
      <p class="help-section__p help-section__p--warn" v-html="t('inputsWarn')"></p>
    </section>

    <!-- 定位与缩放 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('positionTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('positionLi1')"></li>
        <li v-html="t('positionLi2')"></li>
        <li v-html="t('positionLi3')"></li>
        <li v-html="t('positionLi4')"></li>
        <li>{{ t('positionLi5') }}</li>
      </ul>
    </section>

    <!-- 画布尺寸 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('canvasTitle') }}</h4>
      <table class="help-table">
        <thead><tr><th>{{ t('tblHeaderMode') }}</th><th>{{ t('tblHeaderMeaning') }}</th></tr></thead>
        <tbody>
          <tr><td v-html="t('tblAuto')"></td><td>{{ t('tblAutoMeaning') }}</td></tr>
          <tr><td v-html="t('tblFixed')"></td><td>{{ t('tblFixedMeaning') }}</td></tr>
        </tbody>
      </table>
      <p class="help-section__p" style="margin-top: 8px;">
        {{ t('canvasNote') }}
      </p>
    </section>

    <!-- 输出 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('outputsTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('outputsLi1')"></li>
        <li v-html="t('outputsLi2')"></li>
        <li>{{ t('outputsLi3') }}</li>
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
</style>