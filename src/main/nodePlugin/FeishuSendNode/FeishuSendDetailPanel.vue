<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { FeishuSendNode, type ReceiveIdType } from './node'

const props = defineProps<{ nodeId: string }>()

const node = shallowRef<FeishuSendNode | undefined>(undefined)

const appId = ref('')
const appSecret = ref('')
const receiveId = ref('')
const receiveIdType = ref<ReceiveIdType>('chat_id')
const autoSend = ref(false)

const ALL_TYPES: { value: ReceiveIdType; label: string }[] = [
  { value: 'chat_id', label: '群 chat_id' },
  { value: 'open_id', label: '用户 open_id' },
  { value: 'user_id', label: '员工 user_id' },
  { value: 'union_id', label: 'union_id' },
  { value: 'email', label: '邮箱' }
]

let unsubscribe: (() => void) | undefined

function syncFromNode(n: FeishuSendNode): void {
  appId.value = n.displayAppId
  appSecret.value = n.displayAppSecret
  receiveId.value = n.displayReceiveId
  receiveIdType.value = n.displayReceiveIdType
  autoSend.value = n.displayAutoSend
}

function onAppIdInput(v: string): void {
  node.value?.setAppId(v)
}

function onAppSecretInput(v: string): void {
  node.value?.setAppSecret(v)
}

function onReceiveIdInput(v: string): void {
  node.value?.setReceiveId(v)
}

function onReceiveIdTypeChange(v: ReceiveIdType): void {
  node.value?.setReceiveIdType(v)
}

function onAutoSendToggle(v: boolean): void {
  node.value?.setAutoSend(v)
}

const currentTextPreview = computed((): string => {
  if (!node.value) return ''
  const t = node.value.getCurrentText()
  return t.length > 80 ? t.slice(0, 80) + '…' : t
})

function onTestSend(): void {
  node.value?.triggerSend()
}

onMounted(() => {
  const found = workspaceScene.getNode(props.nodeId)
  if (found instanceof FeishuSendNode) {
    node.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
  }
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="panel">
    <section class="section">
      <h3 class="section__title">应用凭证</h3>

      <label class="field">
        <span class="field__label">App ID</span>
        <input
          class="field__input"
          type="text"
          :value="appId"
          placeholder="cli_xxxxxxxxxxxxxx"
          @input="onAppIdInput(($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="field">
        <span class="field__label">App Secret</span>
        <input
          class="field__input"
          type="password"
          :value="appSecret"
          placeholder="••••••••••••••••••••"
          @input="onAppSecretInput(($event.target as HTMLInputElement).value)"
        />
      </label>
    </section>

    <section class="section">
      <h3 class="section__title">接收方</h3>

      <label class="field">
        <span class="field__label">ID 类型</span>
        <select
          class="field__input"
          :value="receiveIdType"
          @change="onReceiveIdTypeChange(($event.target as HTMLSelectElement).value as ReceiveIdType)"
        >
          <option v-for="t in ALL_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </label>

      <label class="field">
        <span class="field__label">接收方 ID</span>
        <input
          class="field__input"
          type="text"
          :value="receiveId"
          :placeholder="receiveIdType === 'chat_id' ? 'oc_xxxxxxxxxxxxxxxxx' : receiveIdType === 'open_id' ? 'ou_xxxxxxxxxxxxxxxxx' : '输入接收方 ID'"
          @input="onReceiveIdInput(($event.target as HTMLInputElement).value)"
        />
      </label>
    </section>

    <section class="section">
      <h3 class="section__title">发送行为</h3>

      <label class="switch-row">
        <span class="switch-row__label">自动发送</span>
        <label class="switch">
          <input type="checkbox" :checked="autoSend" @change="onAutoSendToggle(($event.target as HTMLInputElement).checked)" />
          <span class="switch__track">
            <span class="switch__thumb"></span>
          </span>
        </label>
      </label>

      <p class="field__hint">
        关闭时需要手动点节点卡片上的「发送」按钮；开启后 text 输入端口收到值就自动发。
      </p>
    </section>

    <section class="section">
      <h3 class="section__title">当前消息</h3>
      <div class="preview-box">
        <span v-if="currentTextPreview" class="preview-text">{{ currentTextPreview }}</span>
        <span v-else class="preview-empty">消息内容由 text 输入端口提供</span>
      </div>
      <button
        class="test-btn"
        type="button"
        :disabled="!node?.displayAppId || !node?.displayReceiveId"
        @click="onTestSend"
      >
        测试发送
      </button>
    </section>

    <section class="section">
      <h3 class="section__title">飞书后台检查清单</h3>
      <ul class="tips">
        <li>应用已发布（版本管理与发布 → 已上线）</li>
        <li>权限已开：im:message（获取与发送单聊、群组消息）</li>
        <li>机器人已拉进目标群（群机器人 → 添加 → 搜你机器人名字）</li>
        <li>群消息需要 @机器人（或群机器人设置成"接收所有消息"）</li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="less">
.panel {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-sizing: border-box;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__title {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: @color-text-weak;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__label {
    font-size: 11px;
    color: @color-text-weak;
  }

  &__input {
    padding: 6px 8px;
    font-size: 13px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    outline: none;
    background: #fff;
    transition: border-color 0.15s;

    &:focus {
      border-color: #3b82f6;
    }
  }

  &__hint {
    font-size: 11px;
    color: @color-text-weak;
    margin: 4px 0 0;
    line-height: 1.5;
  }
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  &__label {
    font-size: 13px;
    color: @color-text;
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
}

.preview-box {
  min-height: 36px;
  padding: 8px 10px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
}

.preview-text {
  color: @color-text;
}

.preview-empty {
  color: @color-text-weak;
  font-style: italic;
}

.test-btn {
  all: unset;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  background: #3b82f6;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  align-self: flex-start;
  transition: background 0.15s, opacity 0.15s;

  &:hover:not(:disabled) {
    background: #2563eb;
  }

  &:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }
}

.tips {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: @color-text-weak;
  line-height: 1.5;
}
</style>
