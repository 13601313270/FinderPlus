<script setup lang="ts">
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './help.i18n'

const t = useLocalizedMessages(messages)
</script>

<template>
  <div class="help">
    <p>{{ t('intro') }}</p>

    <h3>{{ t('urlTitle') }}</h3>
    <p>{{ t('urlDesc') }}</p>

    <h3>{{ t('selectorTitle') }}</h3>
    <p>{{ t('selectorDesc') }}</p>
    <ul>
      <li><code>{{ t('exLink') }}</code></li>
      <li><code>{{ t('exArticle') }}</code></li>
      <li><code>{{ t('exImg') }}</code></li>
    </ul>

    <h3>{{ t('modeTitle') }}</h3>
    <ul>
      <li>{{ t('modeText') }}</li>
      <li>{{ t('modeHtml') }}</li>
      <li>{{ t('modeAttr') }}</li>
    </ul>

    <h3>{{ t('outputTitle') }}</h3>
    <p>{{ t('outputResults') }}</p>
    <p>{{ t('outputRawHtml') }}</p>
  </div>
</template>

<style scoped lang="less">
.help {
  padding: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #374151;

  h3 {
    margin: 12px 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: #111827;
  }

  p { margin: 4px 0; }

  ul {
    padding-left: 18px;
    margin: 4px 0;
  }

  code {
    background: #f3f4f6;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
}
</style>
