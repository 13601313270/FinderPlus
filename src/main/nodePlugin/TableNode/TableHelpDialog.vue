<script setup lang="ts">
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { helpMessages } from './help.i18n'

/**
 * Table 节点帮助正文。
 * SQL 查询端口那一节用暗色代码块 + 固定示例，重点突出 {table} 占位符。
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

    <!-- 基本用法 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('useTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('useLi1')"></li>
        <li v-html="t('useLi2')"></li>
        <li v-html="t('useLi3')"></li>
      </ul>
    </section>

    <!-- 列设置详解 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('colsTitle') }}</h4>
      <p class="help-section__p" v-html="t('colsBody')"></p>
      <ul class="help-list">
        <li v-html="t('colsLiList')"></li>
        <li v-html="t('colsLiSearch')"></li>
        <li v-html="t('colsLiCanEdit')"></li>
        <li v-html="t('colsLiCanSort')"></li>
      </ul>
    </section>

    <!-- SQL 查询端口 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('sqlTitle') }}</h4>
      <p class="help-section__p" v-html="t('sqlBody')"></p>

      <div class="help-example">
        <div class="help-example__label">{{ t('sqlEx1Label') }}</div>
        <pre class="help-code"><code>{{ t('sqlEx1Code') }}</code></pre>
      </div>

      <div class="help-example">
        <div class="help-example__label">{{ t('sqlEx2Label') }}</div>
        <pre class="help-code"><code>{{ t('sqlEx2Code') }}</code></pre>
      </div>

      <div class="help-example">
        <div class="help-example__label">{{ t('sqlEx3Label') }}</div>
        <pre class="help-code"><code>{{ t('sqlEx3Code') }}</code></pre>
      </div>

      <p class="help-section__p help-section__p--warn" v-html="t('sqlNote')"></p>
    </section>

    <!-- 注意事项 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('notesTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('notesLi1')"></li>
        <li v-html="t('notesLi2')"></li>
        <li v-html="t('notesLi3')"></li>
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

.help-code {
  margin: 4px 0;
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
    white-space: pre;
  }
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
