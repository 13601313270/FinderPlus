<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { FeishuSendNode } from './node'
import { useFeishuBots } from '@renderer/composables/useFeishuBots'
import { useFeishuPersons } from '@renderer/composables/useFeishuPersons'

const props = defineProps<{ nodeId: string }>()

const node = shallowRef<FeishuSendNode | undefined>(undefined)

const { bots } = useFeishuBots()
const { persons } = useFeishuPersons()

const botId = ref('')
const personId = ref('')
const autoSend = ref(false)

let unsubscribe: (() => void) | undefined

function syncFromNode(n: FeishuSendNode): void {
  botId.value = (n as any).botId ?? n.displayBotId
  personId.value = n.displayPersonId
  autoSend.value = n.displayAutoSend
}

function onBotIdChange(v: string): void {
  node.value?.setBotId(v)
}

function onPersonIdChange(v: string): void {
  node.value?.setPersonId(v)
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
    <section class="section row">
      <h3 class="section__title">接收方</h3>

      <label class="field">
        <!-- <span class="field__label">选择联系人</span> -->
        <select class="field__input" style="width: 200px" :value="personId"
          @change="(e: Event) => onPersonIdChange((e.target as HTMLSelectElement).value)">
          <!-- <option value="">-- 请先在设置里添加联系人（或用 InputPort 外部传入） --</option> -->
          <option v-for="p in persons" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>

      <!-- <div v-if="selectedPerson" class="person-info">
        <div class="person-info__row">
          <span class="person-info__key">接收方</span>
          <span class="person-info__val">{{ selectedPerson.receiveIdType }}: {{ selectedPerson.receiveId }}</span>
        </div>
      </div> -->

      <!-- <p class="field__hint">
        选中联系人后，接收方 ID / 类型由联系人条目决定。
        也可以在节点卡片上绑线到 <code>receiveId</code> / <code>receiveIdType</code> 输入端口，外部传入会覆盖面板配置。
      </p> -->
    </section>

    <section class="section row">
      <h3 class="section__title">飞书机器人</h3>

      <label class="field">
        <!-- <span class="field__label">选择机器人</span> -->
        <select class="field__input" style="width: 200px" :value="botId"
          @change="(e: Event) => onBotIdChange((e.target as HTMLSelectElement).value)">
          <!-- <option value="" disabled>请先在设置里添加机器人 --</option> -->
          <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </label>

      <!-- <p class="field__hint">
        必选。联系人不再绑定机器人（跨应用统一的 ID 不需要固定管道），每个节点自己选发送身份。当前生效：{{ effectiveBotLabel }}
      </p> -->
    </section>

    <section class="section row">
      <h3 class="section__title">自动发送</h3>

      <label class="switch-row">
        <!-- <span class="switch-row__label">自动发送</span> -->
        <label class="switch">
          <input type="checkbox" :checked="autoSend"
            @change="onAutoSendToggle(($event.target as HTMLInputElement).checked)" />
          <span class="switch__track">
            <span class="switch__thumb"></span>
          </span>
        </label>
      </label>
    </section>

    <section class="section">
      <h3 class="section__title">当前消息</h3>
      <div class="preview-box">
        <span v-if="currentTextPreview" class="preview-text">{{ currentTextPreview }}</span>
        <span v-else class="preview-empty">消息内容由 text 输入端口提供</span>
      </div>
      <button class="test-btn" type="button" :disabled="!node?.displayCanSend" @click="onTestSend">
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

  &.row {
    flex-direction: row;
    align-items: center;
  }

  &__title {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: @color-text-weak;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    width: 70px;
    flex-shrink: 0;
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

    code {
      background: #f3f4f6;
      padding: 0 3px;
      border-radius: 3px;
      font-size: 11px;
    }
  }
}

.person-info {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  color: #374151;
  line-height: 1.6;

  &__row {
    display: flex;
  }

  &__key {
    width: 56px;
    color: #6b7280;
    flex-shrink: 0;
  }

  &__val {
    word-break: break-all;
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

  input {
    display: none;
  }

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

  input:checked~&__track {
    background: #22c55e;
  }

  input:checked~&__track .switch__thumb {
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
