<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { CommandNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import CommandHelpDialog from './CommandHelpDialog.vue'

/**
 * 命令行节点的渲染组件。
 *
 * 主视图只做两件事：展示**已保存**的命令 + 一个「执行」按钮（点一下即跑，免去手动敲命令）。
 * 命令的增改走齿轮设置面板（popover），不占用主界面——节点是「保存的常用命令」，
 * 不是每次都面对一个空输入框。
 *
 * 定位、两侧端口由 NodeShell 兜底；节点不在场景里时退化为只读。
 */
const props = defineProps<{ id: string }>()

const commandNode = shallowRef<CommandNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => commandNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const name = ref('')
/** 命令模板原文（设置面板里编辑的那个，含 $1 $2…） */
const template = ref('')
/** 生成的最终命令（主视图展示的就是它） */
const command = ref('')
const inputCount = ref(1)
const stdout = ref('')
const stderr = ref('')
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')

let unsubscribe: (() => void) | undefined

const { startDrag } = useNodePosition(() => commandNode.value)

/** 把节点里的状态同步到本地 ref */
function syncFromNode(node: CommandNode): void {
  name.value = node.displayName
  template.value = node.displayTemplate
  command.value = node.displayCommand
  inputCount.value = node.inputCount
  stdout.value = node.displayStdout
  stderr.value = node.displayStderr
  status.value = node.displayStatus
}

const hasCommand = computed(() => command.value.trim().length > 0)
const running = computed(() => status.value === 'running')

/** 名称输入框：改了实时写回节点 */
function onNameInput(e: Event): void {
  const value = (e.target as HTMLInputElement).value
  name.value = value
  commandNode.value?.setName(value)
}

/** 端口增删：编号始终连续，第 N 个端口对应模板里的 $N */
function onAddPort(): void {
  commandNode.value?.addInputPort()
}

function onRemovePort(): void {
  commandNode.value?.removeLastInputPort()
}

// —— 动态高度：命令 / 输出 / 端口数变化时，读根容器 scrollHeight 自动撑 box ——
const rootEl = ref<HTMLDivElement | null>(null)
/** 节点高度上下限 */
const MIN_HEIGHT = 240
const MAX_HEIGHT = 600

/** 下一帧测根容器 scrollHeight，在 [MIN_HEIGHT, MAX_HEIGHT] 之间双向调整 */
function adjustBoxHeight(): void {
  nextTick(() => {
    const el = rootEl.value
    const node = commandNode.value
    if (!el || !node) return
    const needed = Math.round(el.scrollHeight)
    node.setBox(node.box[0], Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, needed)))
  })
}

// 命令文本 / 执行结果 / 端口数变了都可能改变内容高度
watch([command, stdout, stderr, inputCount], adjustBoxHeight)

/**
 * 滚动接力（同 TextDisplayNode）：结果区还能往当前方向滚时 stop 事件，
 * 滚到顶 / 底了就放行让画布接管平移。
 */
function onOutputWheel(e: WheelEvent): void {
  const el = e.currentTarget as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = el
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight
  if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) return
  e.stopPropagation()
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof CommandNode) {
    commandNode.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
    adjustBoxHeight()
  }
})

onUnmounted(() => {
  unsubscribe?.()
  document.removeEventListener('click', onDocClick, true)
})

function onRun(): void {
  commandNode.value?.run()
}

// —— 设置面板：编辑保存的命令 ——

const gearBtn = ref<HTMLButtonElement | null>(null)
const popoverVisible = ref(false)
const popoverPos = ref<{ top: number; left: number }>({ top: 0, left: 0 })
/** 面板里的草稿模板；点「保存」才写回节点 */
const draft = ref('')

function openEditor(): void {
  draft.value = template.value
  nextTick(() => {
    const rect = gearBtn.value?.getBoundingClientRect()
    if (rect) {
      popoverPos.value = { top: rect.bottom + 6, left: Math.max(8, rect.right - 260) }
    }
    popoverVisible.value = true
    document.addEventListener('click', onDocClick, true)
  })
}

function closeEditor(): void {
  popoverVisible.value = false
  document.removeEventListener('click', onDocClick, true)
}

function onGearClick(e: MouseEvent): void {
  e.stopPropagation()
  if (popoverVisible.value) {
    closeEditor()
    return
  }
  openEditor()
}

function onDocClick(e: MouseEvent): void {
  const pop = document.querySelector('.cmd-popover')
  if (pop && pop.contains(e.target as Node)) return
  closeEditor()
}

function onSave(): void {
  commandNode.value?.setTemplate(draft.value)
  closeEditor()
}
</script>

<template>
  <div ref="rootEl" class="node">
    <NodeHeader :title="nodeTitle" :title-hint="t('dragHint')" :drag-handler="startDrag" :help-title="t('helpTitle')" @help="showHelp = true">
      <template #actions>
        <button
          v-if="commandNode"
          ref="gearBtn"
          class="node__gear"
          type="button"
          :title="t('editCommand')"
          @pointerdown.stop
          @click.stop="onGearClick"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- 命令名称（在命令预览上方单独一行） -->
    <input
      v-if="commandNode"
      class="cmd-name"
      type="text"
      :value="name"
      :placeholder="t('namePlaceholder')"
      @input="onNameInput"
    />

    <!-- 生成的最终命令（模板 + 输入值；点这里也能进编辑面板） -->
    <div
      class="cmd-saved"
      :class="{ 'cmd-saved--empty': !hasCommand }"
      :title="t('clickEditHint')"
      @click.stop="openEditor"
    >
      {{ hasCommand ? command : t('noCommand') }}
    </div>

    <!-- 输入端口控制：第 N 个端口对应模板里的 $N -->
    <div class="cmd-ports">
      <span class="cmd-ports__count">{{ t('portsCount', { n: inputCount }) }}</span>
      <div class="cmd-ports__actions">
        <button
          class="cmd-ports__btn"
          type="button"
          :title="t('removePortHint')"
          :disabled="!commandNode || inputCount <= 1"
          @click="onRemovePort"
        >
          －
        </button>
        <button
          class="cmd-ports__btn"
          type="button"
          :title="t('addPortHint')"
          :disabled="!commandNode"
          @click="onAddPort"
        >
          ＋
        </button>
      </div>
    </div>

    <!-- 结果区（滚到顶 / 底时接力给画布） -->
    <div
      class="cmd-output"
      :class="{
        'cmd-output--empty': !stdout && !stderr && status !== 'running',
        'cmd-output--error': status === 'error',
        'cmd-output--running': status === 'running'
      }"
      @wheel="onOutputWheel"
    >
      <template v-if="status === 'running'">
        <span class="cmd-output__spinner" />
        <span>{{ t('running') }}</span>
      </template>
      <template v-else-if="stderr">{{ stderr }}</template>
      <template v-else-if="stdout">{{ stdout }}</template>
      <template v-else-if="status === 'done'">{{ t('noOutput') }}</template>
      <template v-else>{{ commandNode ? t('clickToRun') : t('nodeMissing') }}</template>
    </div>

    <!-- 主操作：执行 -->
    <button
      v-if="commandNode"
      class="node__run"
      type="button"
      :disabled="running || !hasCommand"
      :title="hasCommand ? t('runHint') : t('runHintNoCommand')"
      @click="onRun"
    >
      {{ running ? t('running') : t('run') }}
    </button>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <CommandHelpDialog />
  </HelpDialog>

  <!-- 编辑面板：Teleport 到 body，避免被节点 overflow clip -->
  <Teleport to="body">
    <div
      v-if="popoverVisible"
      class="cmd-popover"
      :style="{ top: popoverPos.top + 'px', left: popoverPos.left + 'px' }"
      @click.stop
    >
      <div class="cmd-popover__title">{{ t('editorTitle') }}</div>
      <textarea
        v-model="draft"
        class="cmd-popover__input"
        rows="4"
        :placeholder="t('templatePlaceholder')"
      />
      <div class="cmd-popover__actions">
        <button class="cmd-popover__btn cmd-popover__btn--ghost" type="button" @click="closeEditor">
          {{ t('cancel') }}
        </button>
        <button class="cmd-popover__btn" type="button" @click="onSave">{{ t('save') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  padding: 8px;
  padding-top: 0;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px dashed @node-border-color;
    padding: 4px 0;
    cursor: grab;
    user-select: none;
    margin-bottom: 4px;

    &:active {
      cursor: grabbing;
    }
  }

  &__handle {
    font-size: 12px;
    color: @color-text-weak;
    padding: 2px 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__gear {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    color: #6b7280;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: #111827;
      background: #f3f4f6;
    }

    &:active {
      background: #e5e7eb;
    }
  }

  &__run {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    height: 34px;
    font-size: 13px;
    font-weight: 500;
    margin-top: 4px;
    color: #fff;
    background: #3b82f6;
    border-radius: 6px;
    white-space: nowrap;
    flex-shrink: 0;
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

// 命令名称：节点里单独一行（在命令预览上方）
.cmd-name {
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  padding: 6px 9px;
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  border: 1px solid transparent;
  border-radius: 6px;
  background: #f5f7f9;
  outline: none;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: @node-border-color;
  }

  &:focus {
    border-color: #3b82f6;
    background: @color-surface;
  }

  &::placeholder {
    color: #9aa2ad;
    font-weight: 400;
  }
}

// 输入端口控制栏：左侧计数、右侧增删按钮
.cmd-ports {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  font-size: 11px;
  margin-top: 4px;
  color: @color-text-weak;

  &__count {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  &__btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 1px solid @node-border-color;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1;
    color: @color-text;

    &:hover:not(:disabled) {
      border-color: @color-primary;
      color: @color-primary;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }
  }
}

// 已保存命令的展示
.cmd-saved {
  flex-shrink: 0;
  padding: 7px 9px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 12px;
  margin-top: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  color: #1f2937;
  cursor: text;

  &:hover {
    border-color: #3b82f6;
  }

  &--empty {
    color: #9aa2ad;
    font-style: italic;
    font-family: inherit;
  }
}

.cmd-output {
  padding: 10px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  font-size: 12px;
  margin-top: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1;
  min-height: 60px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;
  overflow: auto;

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
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 编辑面板 popover（Teleport 到 body）
.cmd-popover {
  position: fixed;
  z-index: 2000;
  width: 260px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

  &__title {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 6px;
  }

  &__input {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    padding: 6px 8px;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    line-height: 1.5;
    border: 1px solid @node-border-color;
    border-radius: 6px;
    outline: none;

    &:focus {
      border-color: #3b82f6;
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 8px;
  }

  &__btn {
    all: unset;
    cursor: pointer;
    padding: 5px 14px;
    font-size: 12px;
    border-radius: 6px;
    color: #fff;
    background: #3b82f6;
    transition: background 0.15s;

    &:hover {
      background: #2563eb;
    }

    &--ghost {
      color: #6b7280;
      background: #f3f4f6;

      &:hover {
        background: #e5e7eb;
      }
    }
  }
}
</style>