<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * 「文件类节点」帮助文档。
 *
 * 讲解文件类节点（txt-file、img-file、any-file 及 folder/img-folder 容器）
 * 通过"从系统文件管理器拖拽进画布"方式创建的流程。
 *
 * 正文词条放在 i18n 的 fileDragGuide.* 下。行内代码用 <i18n-t> 组件插值，
 * 保持与 Introduction.vue 一致的写法和样式。
 */
const { t } = useI18n()
</script>

<template>
  <div class="help-body">
    <!-- 什么是文件类节点 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('fileDragGuide.whatIs.title') }}</h4>
      <i18n-t keypath="fileDragGuide.whatIs.body" tag="p" class="help-section__p">
        <template #txt><code>txt-file</code></template>
        <template #img><code>img-file</code></template>
        <template #any><code>any-file</code></template>
        <template #folder><code>folder</code></template>
        <template #imgfolder><code>img-folder</code></template>
      </i18n-t>
    </section>

    <!-- 为什么调色板里找不到 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('fileDragGuide.palette.title') }}</h4>
      <i18n-t keypath="fileDragGuide.palette.body" tag="p" class="help-section__p">
        <template #plus><code>＋</code></template>
      </i18n-t>
    </section>

    <!-- 如何创建 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('fileDragGuide.howTo.title') }}</h4>
      <ol class="help-list help-list--ordered">
        <li>{{ t('fileDragGuide.howTo.step1') }}</li>
        <li>{{ t('fileDragGuide.howTo.step2') }}</li>
        <li>{{ t('fileDragGuide.howTo.step3') }}</li>
      </ol>
      <div class="help-tip">
        <div class="help-tip__label">{{ t('fileDragGuide.howTo.noteTitle') }}</div>
        <div class="help-tip__body">{{ t('fileDragGuide.howTo.noteBody') }}</div>
      </div>
    </section>

    <!-- 文件类型映射表 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('fileDragGuide.mapping.title') }}</h4>
      <table class="help-table">
        <thead>
          <tr>
            <th>{{ t('fileDragGuide.mapping.category') }}</th>
            <th>{{ t('fileDragGuide.mapping.fileType') }}</th>
            <th>{{ t('fileDragGuide.mapping.nodeType') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ t('valueKind.txt-file') }}</td>
            <td>{{ t('fileDragGuide.mapping.txt') }}</td>
            <td><code>txt-file</code></td>
          </tr>
          <tr>
            <td>{{ t('valueKind.img-file') }}</td>
            <td>{{ t('fileDragGuide.mapping.img') }}</td>
            <td><code>img-file</code></td>
          </tr>
          <tr>
            <td>{{ t('valueKind.file') }}</td>
            <td>{{ t('fileDragGuide.mapping.any') }}</td>
            <td><code>any-file</code></td>
          </tr>
          <tr>
            <td>{{ t('fileDragGuide.mapping.folder') }}</td>
            <td>{{ t('fileDragGuide.mapping.folder') }}</td>
            <td><code>folder</code></td>
          </tr>
          <tr>
            <td>{{ t('fileDragGuide.mapping.imgfolder') }}</td>
            <td>{{ t('fileDragGuide.mapping.imgfolder') }}</td>
            <td><code>img-folder</code></td>
          </tr>
        </tbody>
      </table>
      <p class="help-section__p" style="margin-top: 8px;">
        {{ t('fileDragGuide.mapping.footer') }}
      </p>
    </section>

    <!-- 拖入文件夹容器 -->
    <section class="help-section">
      <h4 class="help-section__title">{{ t('fileDragGuide.intoFolder.title') }}</h4>
      <i18n-t keypath="fileDragGuide.intoFolder.body" tag="p" class="help-section__p">
        <template #folder><code>folder</code></template>
      </i18n-t>
    </section>
  </div>
</template>

<style scoped lang="less">
/* 复用 Introduction.vue 的全部样式 */
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

/* 提示框：独有的样式，用于 Note/Tip 块 */
.help-tip {
  margin-top: 10px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-left: 3px solid #3b82f6;
  border-radius: 0 6px 6px 0;
  font-size: 12px;
  line-height: 1.6;
  color: #075985;

  &__label {
    font-weight: 600;
    margin-bottom: 2px;
  }

  &__body {
    color: #0369a1;
  }
}
</style>
