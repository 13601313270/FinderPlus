<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import type { Node } from '../../engine/node/Node'
import { ProxyNode } from './node'
import { manifestFor } from '../index'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import NodeShell from '@renderer/components/NodeShell.vue'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import GearIcon from '@renderer/components/icons/GearIcon.vue'

const { openNodeDetail } = useNodeDetail()

const props = defineProps<{ id: string }>()

const proxyNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof ProxyNode ? node : undefined
})

const nodeTitle = useNodeTitle(() => proxyNode.value, '?')

const inputCount = ref(1)
const outputCount = ref(1)
const children = ref<Node[]>([])

let offChanged: (() => void) | undefined

function sync(): void {
  const node = proxyNode.value
  if (!node) {
    inputCount.value = 1
    outputCount.value = 1
    children.value = []
    return
  }
  inputCount.value = node.displayInputPortCount
  outputCount.value = node.displayOutputPortCount
  children.value = [...node.children]
}

onMounted(() => {
  sync()
  offChanged = proxyNode.value?.onChanged(sync)
})

onUnmounted(() => {
  offChanged?.()
})
</script>

<template>
  <div class="proxy">
    <NodeHeader :title="nodeTitle">
      <template #actions>
        <button class="browser-gear" type="button" @pointerdown.stop @click.stop="openNodeDetail(id)">
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- 子节点：嵌套 NodeShell 以相对坐标渲染进 ProxyNode DOM；端口/边/小地图按世界坐标测量正确 -->
    <NodeShell
      v-for="c in children"
      :key="c.id"
      :node="c"
      :render="manifestFor(c as Node)?.render"
    />
  </div>
</template>

<style scoped lang="less">
.proxy {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 8px;
  padding-top: 0;
  overflow: visible; // 子节点需要能溢出 ProxyNode 框

  &__summary {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__summary-item {
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #6b7280;
  }
}

.browser-gear {
  cursor: pointer;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f3f4f6;
  color: #9ca3af;
  flex-shrink: 0;
  border: none;

  svg {
    width: 12px;
    height: 12px;
  }
}
</style>
