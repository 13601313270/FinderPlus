<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import textToImageWorkflow from '../../assets/images/text-to-image-workflow.png'

/**
 * 「关于 Finder+」帮助文档。
 *
 * 正文词条统一放在 i18n 的 intro.* 下。凡是有行内加粗 / 行内代码的句子，
 * 都用 <i18n-t> 做组件插值：完整句子留在词条里（各语言可以自由调整语序），
 * 加粗和 <code> 这些标记留在模板里（这样 scoped 样式照常生效）。
 */
const { t } = useI18n()
</script>

<template>
  <div class="help-body">
    <!-- 软件介绍 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('intro.whatIs.title') }}</h4>
      <i18n-t keypath="intro.whatIs.body" tag="p" class="help-section__p">
        <template #arch>
          <b>{{ t('intro.whatIs.arch') }}</b>
        </template>
      </i18n-t>
    </section>

    <!-- 核心概念 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('intro.concepts.title') }}</h4>

      <div class="help-concept">
        <div class="help-concept__name">{{ t('intro.concepts.node.name') }}</div>
        <i18n-t keypath="intro.concepts.node.desc" tag="div" class="help-concept__desc">
          <template #c1><code>text-input</code></template>
          <template #c2><code>code</code></template>
          <template #c3><code>llm</code></template>
        </i18n-t>
      </div>

      <div class="help-concept">
        <div class="help-concept__name">{{ t('intro.concepts.port.name') }}</div>
        <i18n-t keypath="intro.concepts.port.desc" tag="div" class="help-concept__desc">
          <template #input>
            <b>{{ t('intro.concepts.port.input') }}</b>
          </template>
          <template #output>
            <b>{{ t('intro.concepts.port.output') }}</b>
          </template>
          <template #c1><code>number</code></template>
          <template #c2><code>string</code></template>
          <template #c3><code>file</code></template>
        </i18n-t>
      </div>

      <div class="help-concept">
        <div class="help-concept__name">{{ t('intro.concepts.edge.name') }}</div>
        <div class="help-concept__desc">{{ t('intro.concepts.edge.desc') }}</div>
      </div>

      <div class="help-concept">
        <div class="help-concept__name">{{ t('intro.concepts.scene.name') }}</div>
        <div class="help-concept__desc">{{ t('intro.concepts.scene.desc') }}</div>
      </div>
    </section>

    <!-- 快速上手 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('intro.quickStart.title') }}</h4>
      <ol class="help-list help-list--ordered">
        <i18n-t keypath="intro.quickStart.step1" tag="li">
          <template #plus><code>＋</code></template>
        </i18n-t>
        <li>{{ t('intro.quickStart.step2') }}</li>
        <li>{{ t('intro.quickStart.step3') }}</li>
        <li>{{ t('intro.quickStart.step4') }}</li>
        <i18n-t keypath="intro.quickStart.step5" tag="li">
          <template #help><code>help</code></template>
        </i18n-t>
      </ol>
    </section>

    <!-- 节点类型 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('intro.nodeTypes.title') }}</h4>
      <table class="help-table">
        <thead>
          <tr>
            <th>{{ t('intro.nodeTypes.category') }}</th>
            <th>{{ t('intro.nodeTypes.common') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ t('intro.nodeTypes.input') }}</td>
            <td>
              <code>text-input</code>{{ t('intro.nodeTypes.sep') }}<code>number-input</code>{{ t('intro.nodeTypes.sep') }}<code>bool-input</code>{{ t('intro.nodeTypes.sep') }}<code>txt-file</code>{{ t('intro.nodeTypes.sep') }}<code>img-file</code>
            </td>
          </tr>
          <tr>
            <td>{{ t('intro.nodeTypes.process') }}</td>
            <td>
              <code>code</code>{{ t('intro.nodeTypes.sep') }}<code>llm</code>{{ t('intro.nodeTypes.sep') }}<code>command</code>{{ t('intro.nodeTypes.sep') }}<code>http-request</code>{{ t('intro.nodeTypes.sep') }}<code>image-compress</code>
            </td>
          </tr>
          <tr>
            <td>{{ t('intro.nodeTypes.output') }}</td>
            <td>
              <code>text-display</code>{{ t('intro.nodeTypes.sep') }}<code>number-display</code>{{ t('intro.nodeTypes.sep') }}<code>image-preview</code>{{ t('intro.nodeTypes.sep') }}<code>human-review</code>
            </td>
          </tr>
          <tr>
            <td>{{ t('intro.nodeTypes.container') }}</td>
            <td>
              <code>folder</code>{{ t('intro.nodeTypes.sep') }}<code>img-folder</code>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="help-section__p" style="margin-top: 8px;">
        {{ t('intro.nodeTypes.footer') }}
      </p>
    </section>

    <!-- 典型工作流展示 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('intro.gallery.title') }}</h4>
      <i18n-t keypath="intro.gallery.caption" tag="p" class="help-section__p">
        <template #imageGen><code>image-gen</code></template>
        <template #llm><code>llm</code></template>
        <template #code><code>code</code></template>
      </i18n-t>
      <div class="help-gallery">
        <img :src="textToImageWorkflow" class="help-gallery__img" alt="text-to-image workflow" />
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
    line-height: 1.7;
    color: #4b5563;

    code {
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 3px;
    }

    b {
      color: #1f2937;
    }
  }
}

.help-concept {
  padding: 8px 0;
  border-bottom: 1px dashed #f3f4f6;

  &:last-child {
    border-bottom: none;
  }

  &__name {
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 2px;
  }

  &__desc {
    font-size: 12px;
    line-height: 1.7;
    color: #4b5563;

    code {
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 3px;
    }
  }
}

.help-list {
  margin: 6px 0 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.8;
  color: #4b5563;

  &--ordered {
    list-style: decimal;
  }

  li {
    code {
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
    width: 80px;
  }

  td {
    color: #4b5563;

    code {
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 3px;
    }
  }
}

.help-gallery {
  margin-top: 10px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #f3f4f6;
  background: #fafafa;

  &__img {
    display: block;
    width: 100%;
    height: auto;
  }
}
</style>