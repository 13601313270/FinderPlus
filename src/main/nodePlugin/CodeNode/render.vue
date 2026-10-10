<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { CodeNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import CodeHelpDialog from './CodeHelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { messages } from './i18n'

/**
 * 代码节点的渲染组件。
 *
 * 主视图：输入端口管理区 + 输出端口管理区 + 用法提示 + 代码编辑区 + 结果区 + 执行按钮。
 *
 * 输入端口由用户自定义变量名，函数体里直接用这个变量名引用。
 * 输出端口由用户自定义端口名，函数体里通过 callOutputPort("端口名", 值) 提交。
 *
 * 定位、两侧端口由 NodeShell 兜底；节点不在场景里时退化为只读。
 */
const props = defineProps<{ id: string }>()

const codeNode = shallowRef<CodeNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => codeNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)
const code = ref('')
const resultText = ref('')
const errorText = ref('')
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const autoRun = ref(false)
// 帮助浮层开关（状态保留在 render.vue，HelpDialog 组件负责弹窗壳）
const showHelp = ref(false)
// 日志弹窗开关
const showLog = ref(false)

const { openNodeDetail } = useNodeDetail()

let unsubscribe: (() => void) | undefined


/** 把节点里的状态同步到本地 ref */
function syncFromNode(node: CodeNode): void {
  code.value = node.displayCode
  resultText.value = node.displayResult
  errorText.value = node.displayError
  status.value = node.displayStatus
  autoRun.value = node.displayAutoRun
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof CodeNode) {
    codeNode.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

const hasCode = computed(() => code.value.trim().length > 0)
const running = computed(() => status.value === 'running')

/** 从 resultText 或 errorText 中提取最后一行，用于在卡片上显示最新输出 */
const lastLine = computed(() => {
  const text = errorText.value || resultText.value
  if (!text) return ''
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  return lines.length > 0 ? lines[lines.length - 1]! : text
})

const STATUS_KEYS = {
  idle: 'statusIdle',
  running: 'statusRunning',
  done: 'statusDone',
  error: 'statusError'
} as const

const statusLabel = computed(() => t(STATUS_KEYS[status.value]))

function onRun(): void {
  codeNode.value?.run(true)
}

/** 切换自动执行开关 */
function onAutoRunToggle(e: Event): void {
  codeNode.value?.setAutoRun((e.target as HTMLInputElement).checked)
}
</script>

<template>
  <div class="node">
    <NodeHeader
      :title="nodeTitle"
      @help="showHelp = true"
    >
      <template #actions>
        <span class="node__status" :class="`node__status--${status}`">{{ statusLabel }}</span>
      </template>
    </NodeHeader>

    <!-- 配置入口按钮：点击打开全局 NodeDetailDialog -->
    <button
      class="node__config-btn"
      type="button"
      :disabled="!codeNode"
      :title="t('configTitle')"
      @click.stop="openNodeDetail(props.id)"
    >{{ t('configBtn') }}</button>

    <!-- 结果区（常驻画布） -->
    <div
      class="code-output-wrapper"
    >
      <div
        class="code-output"
        :class="{
          'code-output--empty': !resultText && !errorText && status !== 'running',
          'code-output--error': status === 'error',
          'code-output--running': status === 'running'
        }"
      >
        <template v-if="status === 'running'">
          <span class="code-output__spinner" />
          <span>{{ t('running') }}</span>
        </template>
        <template v-else-if="errorText || resultText">{{ lastLine }}</template>
        <template v-else>{{ codeNode ? t('clickToRun') : t('nodeMissing') }}</template>
      </div>
      <button
        v-if="(resultText || errorText) && status !== 'running'"
        class="code-output__log-btn"
        type="button"
        :title="t('logBtnTitle')"
        @click.stop="showLog = true"
      >{{ t('logBtn') }}</button>
    </div>

    <!-- 主操作：自动执行开关 + 执行按钮 -->
    <div class="node__actions">
      <label class="auto-run">
        <input
          type="checkbox"
          class="auto-run__checkbox"
          :checked="autoRun"
          :disabled="!codeNode"
          @change="onAutoRunToggle"
        />
        <span class="auto-run__slider" aria-hidden="true" />
        <span class="auto-run__label">{{ t('autoLabel') }}</span>
      </label>
      <button
        class="node__run"
        type="button"
        :disabled="running || !hasCode"
        :title="hasCode ? t('runHint') : t('runHintNoCode')"
        @click="onRun"
      >
        {{ running ? t('running') : t('run') }}
      </button>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <CodeHelpDialog />
  </HelpDialog>

  <!-- 日志弹窗：展示完整输出 -->
  <HelpDialog :visible="showLog" :title="t('logDialogTitle')" width="600" @close="showLog = false">
    <div class="log-content" :class="{ 'log-content--error': errorText }">
      <template v-if="errorText">{{ errorText }}</template>
      <template v-else>{{ resultText }}</template>
    </div>
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  padding-top: 0;

  :deep(.node-header__actions) {
    gap: 6px;
  }

  &__status {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    background: #f3f4f6;
    color: #6b7280;
    flex-shrink: 0;

    &--running {
      background: #dbeafe;
      color: #2563eb;
    }

    &--done {
      background: #dcfce7;
      color: #16a34a;
    }

    &--error {
      background: #fee2e2;
      color: #dc2626;
    }
  }

  &__config-btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 30px;
    border-radius: 5px;
    background: #f0f4ff;
    border: 1px dashed #93c5fd;
    color: #3b82f6;
    font-size: 12px;
    font-weight: 500;
    transition: background 0.15s, border-color 0.15s;
    box-sizing: border-box;

    &:hover:not(:disabled) {
      background: #dbeafe;
      border-color: #60a5fa;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__run {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    box-sizing: border-box;
    height: 34px;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    background: #3b82f6;
    border-radius: 6px;
    white-space: nowrap;
    min-width: 0;
    transition: background 0.15s;

    &:hover:not(:disabled) {
      background: #2563eb;
    }

    &:active:not(:disabled) {
      background: #1d4ed8;
    }

    &:disabled {
      cursor: not-allowed;
      background: #93c5fd;
    }
  }
}

.code-output-wrapper {
  display: flex;
  align-items: stretch;
  gap: 6px;
  flex-shrink: 0;
}

.code-output {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;

  &--empty {
    color: #9aa2ad;
    font-style: italic;
    font-family: inherit;
  }

  &--error {
    color: #dc2626;
    border-color: #fecaca;
    background: #fef2f2;
  }

  &--running {
    justify-content: flex-start;
    color: #3b82f6;
    font-family: inherit;
  }

  &__spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #bfdbfe;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  &__log-btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 10px;
    border-radius: 6px;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 11px;
    font-weight: 500;
    font-family: inherit;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #e5e7eb;
      color: #374151;
    }

    &:active {
      background: #d1d5db;
    }
  }
}

.log-content {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #1f2937;
  white-space: pre-wrap;
  word-break: break-all;

  &--error {
    color: #dc2626;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.auto-run {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;

  &__checkbox {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;

    &:checked + .auto-run__slider {
      background: #3b82f6;

      &::after {
        transform: translateX(14px);
      }
    }

    &:disabled + .auto-run__slider {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__slider {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 18px;
    background: #d1d5db;
    border-radius: 9px;
    transition: background 0.15s;

    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
      transition: transform 0.15s;
    }
  }

  &__label {
    font-size: 11px;
    color: @color-text-weak;
    line-height: 1;
  }
}
</style>
