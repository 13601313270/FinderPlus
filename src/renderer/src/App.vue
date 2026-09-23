<script setup lang="ts">
import { workspaceScene } from '../../main/engine/graph/SceneRegistry'
import { TextInputNode } from '../../main/nodePlugin/TextInputNode/node'
import { TextDisplayNode } from '../../main/nodePlugin/TextDisplayNode/node'
import { manifestFor } from '../../main/nodePlugin'

// 测试画布：极简，只验证「输入框能不能影响下游展示」，顺带验证节点可拖拽、位置写回引擎。

const input = new TextInputNode('test-input')
const display = new TextDisplayNode('test-display')

// 给两张卡片一个初始落点，别叠在一起
input.setPosition(60, 60)
display.setPosition(420, 60)

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
  <section class="stage">
    <header class="stage__header">
      <h2 class="stage__title">测试画布：输入框 → 展示节点</h2>
      <p class="stage__hint">拖动手柄移动卡片；在输入框里打字，另一张卡片应立即同步更新。</p>
    </header>

    <!-- 节点用 position 绝对定位在画布上，拖拽时即改即动 -->
    <div class="stage__canvas">
      <component v-for="node in nodes" :key="node.id" :is="manifestFor(node)?.render" :id="node.id" />
    </div>
  </section>
</template>

<style scoped lang="less">
.stage {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 24px;

  &__header {
    margin-bottom: 16px;
  }

  &__title {
    margin: 0 0 8px;
    font-size: 20px;
  }

  &__hint {
    margin: 0;
    color: @color-text-weak;
    font-size: 13px;
  }

  &__canvas {
    position: relative;
    flex: 1;
    min-height: 320px;
    border: 1px dashed #d5d9e0;
    border-radius: @radius-md;
    overflow: hidden;
  }
}
</style>