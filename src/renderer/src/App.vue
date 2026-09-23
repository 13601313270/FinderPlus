<script setup lang="ts">
import { workspaceScene } from '../../main/engine/graph/SceneRegistry'
import { TextInputNode } from '../../main/nodePlugin/TextInputNode/node'
import { TextDisplayNode } from '../../main/nodePlugin/TextDisplayNode/node'
import { manifestFor } from '../../main/nodePlugin'

// 测试画布：极简，只验证「输入框能不能影响下游展示」。

const input = new TextInputNode('test-input')
const display = new TextDisplayNode('test-display')

workspaceScene.addNode(input)
workspaceScene.addNode(display)

// TextInputNode.textOutput -> TextDisplayNode.textInput
const connect = workspaceScene.connect(input.textOutput, display.textInput)
if (!connect.ok) {
  console.error('[test-canvas] connect failed:', connect.reason)
}

// 给个初始值做基线，之后在输入框里改动应实时反映到展示
input.setText('你好，引擎！')

// 渲染组件一律按 node.type 从注册表取 manifest，杜绝自己把渲染组件绑错节点。
const nodes = [input, display]
</script>

<template>
  <div class="stage">
    <h2 class="stage__title">测试画布：输入框 → 展示节点</h2>
    <p class="stage__hint">在输入框里打字，右侧展示应立即同步更新。</p>

    <section v-for="node in nodes" :key="node.id" class="node-card">
      <span class="node-card__label">{{ manifestFor(node)?.type ?? node.type }}</span>
      <component :is="manifestFor(node)?.render" :id="node.id" />
    </section>
  </div>
</template>

<style scoped lang="less">
.stage {
  padding: 24px;

  &__title {
    margin: 0 0 8px;
    font-size: 20px;
  }

  &__hint {
    margin: 0 0 24px;
    color: @color-text-weak;
    font-size: 13px;
  }
}

.node-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
  margin-bottom: @space-md;
  padding: @space-md;
  background: @color-surface;
  border-radius: @radius-md;

  &__label {
    font-size: 12px;
    color: @color-text-weak;
  }
}
</style>