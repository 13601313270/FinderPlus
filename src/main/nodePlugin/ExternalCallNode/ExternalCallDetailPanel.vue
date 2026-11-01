<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ExternalCallNode, type ExternalCallPortMeta, type ExternalCallPortKind, type ExternalCallPortNameError } from './node'

const props = defineProps<{ nodeId: string }>()

const node = shallowRef<ExternalCallNode | undefined>(undefined)
const ports = ref<readonly ExternalCallPortMeta[]>([])

// 每个端口名输入框对应的临时校验错误（key 是 port id）
const portNameErrors = ref<Record<string, ExternalCallPortNameError>>({})

let offChanged: (() => void) | undefined

function syncFromNode(n: ExternalCallNode): void {
  ports.value = [...n.displayPorts]
}

onMounted(() => {
  const found = workspaceScene.getNode(props.nodeId)
  if (found instanceof ExternalCallNode) {
    node.value = found
    syncFromNode(found)
    offChanged = found.onChanged(() => syncFromNode(found))
  }
})

onUnmounted(() => {
  offChanged?.()
})

const hasPorts = computed(() => ports.value.length > 0)

// —— 端口操作（输入输出对齐） ——

function onAddPort(): void {
  node.value?.addPort()
}

function onRemovePort(id: string): void {
  delete portNameErrors.value[id]
  node.value?.removePortById(id)
}

function onPortNameChange(id: string, e: Event): void {
  const n = node.value
  if (!n) return
  const value = (e.target as HTMLInputElement).value
  const err = n.validatePortName(value, id)
  if (err) {
    portNameErrors.value[id] = err
  } else {
    delete portNameErrors.value[id]
    n.setPortName(id, value)
  }
}

function onPortKindChange(id: string, e: Event): void {
  node.value?.setPortKind(id, (e.target as HTMLSelectElement).value as ExternalCallPortKind)
}

/** 把端口名校验失败原因翻译成中文文案 */
function errText(err: ExternalCallPortNameError | undefined): string {
  if (!err) return ''
  switch (err.kind) {
    case 'empty': return '端口名不能为空'
    case 'invalid-ident': return '只能包含字母、数字、下划线，且不能以数字开头'
    case 'duplicate-input': return `端口名 "${err.name}" 已存在`
  }
}
</script>

<template>
  <div class="panel">
    <!-- 端口管理区（输入输出对齐） -->
    <div class="inputs">
      <div class="inputs__header">
        <span class="inputs__title">端口（输入输出对齐，外部调用时按此名称传参）</span>
        <button class="inputs__add" type="button" :disabled="!node" title="添加端口"
          @click="onAddPort">+</button>
      </div>
      <div v-if="!hasPorts" class="inputs__empty">暂无端口</div>
      <div v-else class="inputs__list">
        <div v-for="port in ports" :key="port.id" class="inputs__row"
          :class="{ 'inputs__row--error': portNameErrors[port.id] }">
          <div class="inputs__row-main">
            <div class="code-row">
              <span class="code-row__label">类型</span>
              <select class="code-select" :value="port.kind" :disabled="!node"
                @change="(e) => onPortKindChange(port.id, e)">
                <option value="number">number</option>
                <option value="string">string</option>
                <option value="bool">bool</option>
                <option value="file">file</option>
                <option value="json">json</option>
              </select>
            </div>
            <div class="code-row">
              <span class="code-row__label">端口名</span>
              <input class="code-input" type="text" :value="port.name" :disabled="!node" maxlength="32"
                @input="(e) => onPortNameChange(port.id, e)" />
            </div>
            <button class="inputs__remove" type="button" :disabled="!node" title="删除"
              @click="onRemovePort(port.id)">×</button>
          </div>
          <div v-if="portNameErrors[port.id]">
            <span class="inputs__errmsg">{{ errText(portNameErrors[port.id]) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 说明区 -->
    <div class="hint">
      <div class="hint__title">💡 使用说明</div>
      <ul class="hint__list">
        <li>每个端口自动生成<b>输入</b>和<b>输出</b>，数量/名称/类型完全对齐</li>
        <li>外部调用时按<b>端口名</b>传参，节点自动 commit 到对应的输出端口推送给下游</li>
        <li>修改端口类型后旧连线会断开，需要重新连接</li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="less">
.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  box-sizing: border-box;
  height: 100%;

  .inputs {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    &__title {
      font-size: 13px;
      font-weight: 500;
      color: #374151;
    }

    &__add {
      all: unset;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: #f0f4ff;
      color: #3b82f6;
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      transition: background 0.15s;

      &:hover:not(:disabled) {
        background: #dbeafe;
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }

    &__empty {
      font-size: 12px;
      color: #9aa2ad;
      font-style: italic;
      padding: 6px 0;
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: #fafbfc;

      &--error {
        border-color: #fecaca;
        background: #fef2f2;
      }
    }

    &__row-main {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &__remove {
      all: unset;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      color: #9aa2ad;
      font-size: 16px;
      line-height: 1;
      flex-shrink: 0;

      &:hover:not(:disabled) {
        color: #dc2626;
        background: #fee2e2;
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.3;
      }
    }

    &__errmsg {
      font-size: 11px;
      color: #dc2626;
    }
  }

  .code-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;

    &__label {
      font-size: 12px;
      color: #6b7280;
      user-select: none;
      flex-shrink: 0;
    }
  }

  .code-select,
  .code-input {
    box-sizing: border-box;
    padding: 5px 8px;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #1f2937;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    outline: none;
    transition: border-color 0.15s;
    flex: 1;
    min-width: 0;

    &:focus {
      border-color: #3b82f6;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .code-select {
    cursor: pointer;
    flex: 0.8;
  }

  .hint {
    padding: 10px 12px;
    border: 1px dashed #d1d5db;
    border-radius: 6px;
    background: #fafbfc;

    &__title {
      font-size: 12px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }

    &__list {
      margin: 0;
      padding-left: 16px;
      font-size: 11px;
      color: #6b7280;
      line-height: 1.6;

      b {
        color: #3b82f6;
      }
    }
  }
}
</style>
