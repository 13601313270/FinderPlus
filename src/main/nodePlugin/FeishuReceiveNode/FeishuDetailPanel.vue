<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { FeishuReceiveNode } from './node'
import { useFeishuBots } from '@renderer/composables/useFeishuBots'

const props = defineProps<{ nodeId: string }>()

const node = shallowRef<FeishuReceiveNode | undefined>(undefined)

const { bots } = useFeishuBots()

const botId = ref('')
const chatIdFilter = ref('')
const enabled = ref(false)
const connState = ref<'idle' | 'connecting' | 'connected' | 'error'>('idle')
const connError = ref('')

let unsubscribe: (() => void) | undefined

const selectedBotLabel = computed((): string => {
  if (!botId.value) return '未选择'
  const bot = bots.value.find((b) => b.id === botId.value)
  return bot ? `${bot.name}（${bot.appId}）` : '已删除'
})

function syncFromNode(n: FeishuReceiveNode): void {
  botId.value = n.displayBotId
  chatIdFilter.value = n.displayChatIdFilter
  enabled.value = n.isEnabled
  connState.value = n.displayConnectionState
  connError.value = n.displayConnectionError
}

function onBotIdChange(v: string): void {
  node.value?.setBotId(v)
}

function onChatIdFilterInput(v: string): void {
  node.value?.setChatIdFilter(v)
}

function onToggleEnabled(): void {
  node.value?.toggleEnabled()
}

onMounted(() => {
  const found = workspaceScene.getNode(props.nodeId)
  if (found instanceof FeishuReceiveNode) {
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
      <h4 class="section__title">飞书机器人</h4>

      <label class="field">
        <span class="field__label">选择机器人</span>
        <select
          class="field__input"
          :value="botId"
          @change="(e: Event) => onBotIdChange((e.target as HTMLSelectElement).value)"
        >
          <option value="">-- 请先在设置里添加机器人 --</option>
          <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}（{{ b.appId }}）</option>
        </select>
      </label>

      <p class="field__hint">
        机器人列表在 <strong>设置 → 飞书机器人</strong> 里管理。当前选择：{{ selectedBotLabel }}
      </p>
    </section>

    <section class="section">
      <h4 class="section__title">可选过滤</h4>

      <label class="field">
        <span class="field__label">群 chat_id</span>
        <input
          class="field__input"
          type="text"
          :value="chatIdFilter"
          placeholder="留空 = 接收所有群/单聊"
          @input="(e: Event) => onChatIdFilterInput((e.target as HTMLInputElement).value)"
        />
      </label>
    </section>

    <section class="section">
      <h4 class="section__title">状态</h4>

      <div class="state-row">
        <label class="switch" @pointerdown.stop>
          <input type="checkbox" :checked="enabled" @change="onToggleEnabled" />
          <span class="switch__track">
            <span class="switch__thumb"></span>
          </span>
        </label>
        <span class="state-text" :class="`state-text--${connState}`">
          {{ connState === 'connected' ? '已连接' : connState === 'connecting' ? '连接中…' : connState === 'error' ? '连接错误' : '空闲' }}
        </span>
      </div>

      <div v-if="connState === 'error' && connError" class="error">{{ connError }}</div>
    </section>

    <section class="section section--help">
      <h4 class="section__title">前置条件</h4>
      <ol class="help-list">
        <li>在 <a href="https://open.feishu.cn/app" target="_blank" rel="noopener">飞书开放平台</a> 创建企业自建应用</li>
        <li>进入「事件与回调 → 事件配置」，选择「使用长连接接收事件」</li>
        <li>添加订阅事件：<code>im.message.receive_v1</code>（接收消息 v2.0）</li>
        <li>开启机器人能力，把机器人拉进目标群</li>
        <li>在 <strong>设置 → 飞书机器人</strong> 里添加应用凭证，再回到这里选择</li>
      </ol>
    </section>
  </div>
</template>

<style scoped lang="less">
.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 8px;
}

.section {
  &__title {
    margin: 0 0 8px;
    font-size: 12px;
    font-weight: 600;
    color: @color-text;
    letter-spacing: 0.02em;
  }

  &--help {
    border-top: 1px solid @node-border-color;
    padding-top: 12px;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;

  &__label {
    font-size: 11px;
    color: @color-text-weak;
  }

  &__input {
    border: 1px solid @node-border-color;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 12px;
    background: transparent;
    color: @color-text;
    width: 100%;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: @color-primary;
    }
  }

  &__hint {
    font-size: 10px;
    color: @color-text-weak;
    margin: 4px 0 0;
    line-height: 1.5;
  }
}

.state-row {
  display: flex;
  align-items: center;
  gap: 10px;
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

.state-text {
  font-size: 12px;
  color: @color-text-weak;

  &--connected { color: #22c55e; }
  &--connecting { color: #eab308; }
  &--error { color: #ef4444; }
}

.error {
  font-size: 11px;
  color: #ef4444;
  margin-top: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}

.help-list {
  margin: 0;
  padding-left: 18px;
  font-size: 11px;
  color: @color-text-weak;
  line-height: 1.6;

  a {
    color: @color-primary;
    text-decoration: none;

    &:hover { text-decoration: underline; }
  }

  code {
    background: rgba(0, 0, 0, 0.05);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
}
</style>
