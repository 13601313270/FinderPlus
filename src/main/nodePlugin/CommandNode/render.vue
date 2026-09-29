<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { CommandNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import GearIcon from '@renderer/components/icons/GearIcon.vue'

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
const name = ref('')
const command = ref('')
const stdout = ref('')
const stderr = ref('')
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')

let unsubscribe: (() => void) | undefined

const { startDrag } = useNodePosition(() => commandNode.value)

/** 把节点里的状态同步到本地 ref */
function syncFromNode(node: CommandNode): void {
  name.value = node.displayName
  command.value = node.displayCommand
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

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof CommandNode) {
    commandNode.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
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
/** 面板里的草稿命令；点「保存」才写回节点 */
const draft = ref('')

function openEditor(): void {
  draft.value = command.value
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
  commandNode.value?.setCommand(draft.value)
  closeEditor()
}
</script>

<template>
  <div class="node">
    <div class="node__header" @pointerdown="startDrag">
      <span class="node__handle" title="拖动节点（整个头部可拖）">{{ commandNode?.type ?? '?' }}</span>
      <button
        v-if="commandNode"
        ref="gearBtn"
        class="node__gear"
        type="button"
        title="编辑命令"
        @pointerdown.stop
        @click.stop="onGearClick"
      >
        <GearIcon />
      </button>
    </div>

    <!-- 命令名称（在命令预览上方单独一行） -->
    <input
      v-if="commandNode"
      class="cmd-name"
      type="text"
      :value="name"
      placeholder="命令名称，例如：构建项目"
      @input="onNameInput"
    />

    <!-- 已保存的命令（点这里也能进编辑面板） -->
    <div
      class="cmd-saved"
      :class="{ 'cmd-saved--empty': !hasCommand }"
      title="点击编辑命令"
      @click.stop="openEditor"
    >
      {{ hasCommand ? command : '（未设置命令，点击这里或齿轮设置）' }}
    </div>

    <!-- 结果区 -->
    <div
      class="cmd-output"
      :class="{
        'cmd-output--empty': !stdout && !stderr && status !== 'running',
        'cmd-output--error': status === 'error',
        'cmd-output--running': status === 'running'
      }"
    >
      <template v-if="status === 'running'">
        <span class="cmd-output__spinner" />
        <span>执行中…</span>
      </template>
      <template v-else-if="stderr">{{ stderr }}</template>
      <template v-else-if="stdout">{{ stdout }}</template>
      <template v-else-if="status === 'done'">（无输出）</template>
      <template v-else>{{ commandNode ? '（点击执行运行已保存的命令）' : '节点不存在' }}</template>
    </div>

    <!-- 主操作：执行 -->
    <button
      v-if="commandNode"
      class="node__run"
      type="button"
      :disabled="running || !hasCommand"
      :title="hasCommand ? '执行已保存的命令' : '请先点击齿轮设置命令'"
      @click="onRun"
    >
      {{ running ? '执行中…' : '执行' }}
    </button>
  </div>

  <!-- 编辑面板：Teleport 到 body，避免被节点 overflow clip -->
  <Teleport to="body">
    <div
      v-if="popoverVisible"
      class="cmd-popover"
      :style="{ top: popoverPos.top + 'px', left: popoverPos.left + 'px' }"
      @click.stop
    >
      <div class="cmd-popover__title">编辑命令</div>
      <textarea
        v-model="draft"
        class="cmd-popover__input"
        rows="4"
        placeholder="命令，例如：npm run build"
      />
      <div class="cmd-popover__actions">
        <button class="cmd-popover__btn cmd-popover__btn--ghost" type="button" @click="closeEditor">
          取消
        </button>
        <button class="cmd-popover__btn" type="button" @click="onSave">保存</button>
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
  gap: 8px;
  padding: 10px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px dashed #d5d9e0;
    padding-bottom: 4px;
    cursor: grab;
    user-select: none;

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
    width: 22px;
    height: 22px;
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
  background: #f8fafc;
  outline: none;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: #d5d9e0;
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

// 已保存命令的展示
.cmd-saved {
  flex-shrink: 0;
  max-height: 60px;
  overflow: auto;
  padding: 7px 9px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 12px;
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
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 12px;
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
    border: 1px solid #d5d9e0;
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