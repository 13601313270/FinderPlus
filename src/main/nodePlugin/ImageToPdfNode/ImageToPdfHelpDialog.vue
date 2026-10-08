<script setup lang="ts">
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { helpMessages } from './help.i18n'

const t = useLocalizedMessages(helpMessages)
</script>

<template>
  <div class="help-body">
    <section class="help-section">
      <h4 class="help-section__title">{{ t('whatTitle') }}</h4>
      <p class="help-section__p" v-html="t('whatBody')"></p>
    </section>
    <section class="help-section">
      <h4 class="help-section__title">{{ t('portsTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('portsLi1')"></li>
        <li v-html="t('portsLi2')"></li>
        <li v-html="t('portsLi3')"></li>
      </ul>
    </section>
    <section class="help-section">
      <h4 class="help-section__title">{{ t('useTitle') }}</h4>
      <ul class="help-list">
        <li v-html="t('useLi1')"></li>
        <li v-html="t('useLi2')"></li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="less">
.help-body { display: flex; flex-direction: column; gap: 16px; }
.help-section {
  &__title { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #1a1a1a; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6; }
  &__p { margin: 0; font-size: 12px; line-height: 1.6; color: #4b5563; }
}
.help-list { margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.7; color: #4b5563; }
</style>
