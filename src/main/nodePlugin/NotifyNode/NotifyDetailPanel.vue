<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { NotifyNode } from './node'
import { useFeishuBots } from '@renderer/composables/useFeishuBots'
import { useFeishuPersons } from '@renderer/composables/useFeishuPersons'

/**
 * 通知节点的详情面板中间栏：
 * - 多行 textarea，配置自定义通知文字
 * - 飞书推送通道：开关 + 联系人下拉（机器人身份由联系人条目决定，节点不做 override）
 *
 * 接收 props: { nodeId }，自己到 workspaceScene 拿节点实例。
 */
const props = defineProps<{ nodeId: string }>()

const notifyNode = computed(() => {
  const node = workspaceScene.getNode(props.nodeId)
  return node instanceof NotifyNode ? node : undefined
})

const { bots } = useFeishuBots()
const { persons } = useFeishuPersons()

const templateValue = ref('')

// —— 飞书推送表单状态 ——
const feishuEnabled = ref(false)
const feishuPersonId = ref('')

/** 当前选中的联系人 */
const selectedPerson = computed(() => persons.value.find((p) => p.id === feishuPersonId.value))

/** 联系人绑定的机器人标签（只读展示） */
const personBotLabel = computed((): string => {
  if (!selectedPerson.value) return '—'
  const bot = bots.value.find((b) => b.id === selectedPerson.value!.botId)
  return bot ? `${bot.name}（${bot.appId}）` : '已删除'
})

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = notifyNode.value
  if (!node) return
  sync(node)
  offChanged = node.onChanged(() => {
    if (notifyNode.value) sync(notifyNode.value)
  })
})

onUnmounted(() => {
  offChanged?.()
})

function sync(node: NotifyNode): void {
  templateValue.value = node.getTextTemplate()
  feishuEnabled.value = node.getFeishuEnabled()
  feishuPersonId.value = node.getFeishuPersonId()
}

// —— 事件处理 ——

/** 文字框敲字 → 立即写回节点 */
function onTemplateInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  notifyNode.value?.setTextTemplate(target.value)
}

function onFeishuEnabledToggle(v: boolean): void {
  notifyNode.value?.setFeishuEnabled(v)
}

function onFeishuPersonIdChange(v: string): void {
  notifyNode.value?.setFeishuPersonId(v)
}

// 当 panel 激活时（nodeId 变化）重新 sync
watch(() => props.nodeId, () => {
  const node = notifyNode.value
  if (node) sync(node)
})
</script>

<template>
  <div class="detail-panel">
    <div class="detail-panel__section">
      <label class="detail-panel__label">通知文字</label>
      <textarea
        class="detail-panel__textarea"
        rows="4"
        :value="templateValue"
        :disabled="!notifyNode"
        placeholder="留空则使用输入值的显示名称"
        @input="onTemplateInput"
      />
      <div class="detail-panel__hint">
        收到输入值时将使用此处配置的文字作为通知正文。留空则自动取输入值的显示名称。
      </div>
    </div>

    <!-- ========== 飞书推送通道 ========== -->
    <div class="detail-panel__section">
      <div class="feishu-switch-row">
        <label class="detail-panel__label">飞书推送</label>
        <label class="switch">
          <input
            type="checkbox"
            :checked="feishuEnabled"
            :disabled="!notifyNode"
            @change="onFeishuEnabledToggle(($event.target as HTMLInputElement).checked)"
          />
          <span class="switch__track">
            <span class="switch__thumb"></span>
          </span>
        </label>
      </div>

      <template v-if="feishuEnabled">
        <label class="field">
          <span class="field__label">联系人</span>
          <select
            class="field__input"
            :value="feishuPersonId"
            :disabled="!notifyNode"
            @change="onFeishuPersonIdChange(($event.target as HTMLSelectElement).value)"
          >
            <option value="">-- 请先在设置里添加联系人 --</option>
            <option v-for="p in persons" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>

        <div v-if="selectedPerson" class="person-info">
          <div class="person-info__row">
            <span class="person-info__key">接收方</span>
            <span class="person-info__val">{{ selectedPerson.receiveIdType }}: {{ selectedPerson.receiveId }}</span>
          </div>
          <div class="person-info__row">
            <span class="person-info__key">机器人</span>
            <span class="person-info__val">{{ personBotLabel }}</span>
          </div>
        </div>

        <p class="field__hint">
          启用后，每次收到输入值会向该联系人发一条飞书文本消息（正文复用通知文字）。
          机器人由联系人决定——open_id / union_id / user_id 是应用隔离的，必须用绑定的那个机器人发。
          机器人需要先在飞书开放平台开通 <code>im:message</code> 权限；发给群聊时机器人必须已在群内。
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less">
.detail-panel {
  box-sizing: border-box;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  &__textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    resize: vertical;
    flex-shrink: 0;
    line-height: 1.6;
    color: #1f2937;

    &:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  &__hint {
    font-size: 11px;
    color: #6b7280;
    line-height: 1.5;
  }
}

// —— 飞书推送区 ——
.feishu-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__label {
    font-size: 11px;
    color: #6b7280;
  }

  &__input {
    padding: 6px 8px;
    font-size: 13px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    outline: none;
    background: #fff;
    transition: border-color 0.15s;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  &__hint {
    font-size: 11px;
    color: #6b7280;
    margin: 2px 0 0;
    line-height: 1.5;

    code {
      background: #f3f4f6;
      padding: 0 4px;
      border-radius: 3px;
      font-size: 11px;
    }
  }
}

.person-info {
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__row {
    display: flex;
    font-size: 11px;
    line-height: 1.5;
  }

  &__key {
    color: #6b7280;
    width: 56px;
    flex-shrink: 0;
  }

  &__val {
    color: #374151;
    word-break: break-all;
  }
}

.switch {
  position: relative;
  width: 36px;
  height: 18px;
  cursor: pointer;

  input { display: none; }

  &__track {
    position: absolute;
    inset: 0;
    background: #d1d5db;
    border-radius: 9px;
    transition: background 0.15s ease;
  }

  &__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.15s ease;
  }

  input:checked ~ &__track {
    background: #22c55e;
  }

  input:checked ~ &__track .switch__thumb {
    transform: translateX(18px);
  }

  input:disabled ~ &__track {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
