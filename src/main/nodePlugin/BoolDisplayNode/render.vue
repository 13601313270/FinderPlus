<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { BoolDisplayNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import BoolDisplayHelpDialog from './BoolDisplayHelpDialog.vue'

/**
 * 布尔值展示节点的渲染组件。
 *
 * 定位、两侧端口这些所有节点共用的东西由 NodeShell 兜底，这里不碰。
 * 引擎里的 displayed 只是普通类字段，Vue 追踪不到，所以订阅 node.onChanged
 * 来同步本地 ref，触发重渲染。
 */
const props = defineProps<{ id: string }>()

// shallowRef：ref 会把节点实例深转换成 reactive 代理，引擎里的端口对象
// 按身份比对的连线层会认不出来。引擎对象有自己的通知机制（onChanged），
// 本来也不需要 Vue 去代理它。
const displayNode = shallowRef<BoolDisplayNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title
const nodeTitle = useNodeTitle(() => displayNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts
const t = useLocalizedMessages(messages)

// null 表示还没收到值（区别于 false）
const state = ref<boolean | null>(null)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

let unsubscribe: (() => void) | undefined

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof BoolDisplayNode) {
    displayNode.value = found
    state.value = found.bool
    unsubscribe = found.onChanged(() => {
      state.value = found.bool
    })
  }
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" @help="showHelp = true" />
    <div class="lamp-area">
      <!-- 红绿灯圆灯 -->
      <div
        class="lamp"
        :class="{
          'lamp--green': state === true,
          'lamp--red': state === false,
          'lamp--gray': state === null
        }"
      />
      <!-- 状态文字标签 -->
      <span class="lamp-label" :class="{
        'lamp-label--green': state === true,
        'lamp-label--red': state === false,
        'lamp-label--muted': state === null
      }">
        <template v-if="state === null">
          {{ displayNode ? t('empty') : t('nodeMissing') }}
        </template>
        <template v-else>
          {{ state ? t('stateTrue') : t('stateFalse') }}
        </template>
      </span>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <BoolDisplayHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  padding-top: 0;
}

.lamp-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 6px 10px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
}

// 圆灯：52px 直径，状态切换通过类名改背景色 + 发光阴影
.lamp {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #d1d5db; // 未激活默认暗灰
  transition: background 0.25s ease, box-shadow 0.25s ease;

  // 未激活状态不发光，避免误导
  &--gray {
    background: #d1d5db;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  &--green {
    background: #22c55e;
    box-shadow:
      0 0 0 4px rgba(34, 197, 94, 0.15),
      0 0 24px rgba(34, 197, 94, 0.55),
      inset 0 -3px 8px rgba(0, 0, 0, 0.12);
  }

  &--red {
    background: #ef4444;
    box-shadow:
      0 0 0 4px rgba(239, 68, 68, 0.15),
      0 0 24px rgba(239, 68, 68, 0.55),
      inset 0 -3px 8px rgba(0, 0, 0, 0.12);
  }
}

.lamp-label {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;

  &--green {
    color: #16a34a;
  }

  &--red {
    color: #dc2626;
  }

  &--muted {
    color: #9aa2ad;
    font-style: italic;
    font-weight: 400;
  }
}
</style>
