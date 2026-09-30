<template>
  <div class="help-body">
    <!-- 软件介绍 -->
    <section class="help-section">
      <h4 class="help-section__title">这是什么？</h4>
      <p class="help-section__p">
        CanvasDesk 是一个 <b>节点式 / 画板式</b> 桌面应用，基于 Electron + Vue 3 构建。
        你可以在画布上拖入不同类型的节点，用连线把它们串起来，形成一条数据流管道——
        数据从上游节点沿边流向下游节点，每个节点在自己的位置做变换、检查或产出。
      </p>
    </section>

    <!-- 核心概念 -->
    <section class="help-section">
      <h4 class="help-section__title">核心概念</h4>

      <div class="help-concept">
        <div class="help-concept__name">节点（Node）</div>
        <div class="help-concept__desc">
          画布上的一个功能单元。每个节点有自己的类型（如 <code>text-input</code>、<code>code</code>、<code>llm</code>），
          左侧有输入端口、右侧有输出端口。节点不直接操作画布，只管「接收什么值、产出什么值」。
        </div>
      </div>

      <div class="help-concept">
        <div class="help-concept__name">端口（Port）</div>
        <div class="help-concept__desc">
          节点两侧的小圆点。<b>输入端口</b>（左侧）从上游接收值，<b>输出端口</b>（右侧）向下游推送值。
          每个端口有类型约束（<code>number</code>、<code>string</code>、<code>file</code> 等），
          连线时会实时校验类型是否匹配。
        </div>
      </div>

      <div class="help-concept">
        <div class="help-concept__name">边（Edge）</div>
        <div class="help-concept__desc">
          连接输出端口到输入端口的一条线。值沿边从左向右流动。
          拖拽输出端口圆点到另一个节点的输入端口圆点即可创建连接。
        </div>
      </div>

      <div class="help-concept">
        <div class="help-concept__name">场景（Scene）</div>
        <div class="help-concept__desc">
          画布上所有节点和边的容器。负责节点增删、边的绑定/解绑，以及把变更广播给 UI 层刷新。
        </div>
      </div>
    </section>

    <!-- 快速上手 -->
    <section class="help-section">
      <h4 class="help-section__title">快速上手</h4>
      <ol class="help-list help-list--ordered">
        <li>点左上角 <code>＋</code> 打开节点调色板，选一个节点拖到画布上</li>
        <li>拖入文件会自动识别类型并生成对应的 File 节点</li>
        <li>从某个节点的输出端口（右侧圆点）拖拽连线到另一个节点的输入端口（左侧圆点）</li>
        <li>双击节点或点节点上的齿轮图标配置参数</li>
        <li>有节点配置好 <code>help</code> 的话，点问号图标查看该节点的详细用法</li>
      </ol>
    </section>

    <!-- 节点类型 -->
    <section class="help-section">
      <h4 class="help-section__title">节点类型概览</h4>
      <table class="help-table">
        <thead><tr><th>分类</th><th>常见节点</th></tr></thead>
        <tbody>
          <tr>
            <td>输入</td>
            <td><code>text-input</code>、<code>number-input</code>、<code>bool-input</code>、<code>txt-file</code>、<code>img-file</code></td>
          </tr>
          <tr>
            <td>处理</td>
            <td><code>code</code>、<code>llm</code>、<code>command</code>、<code>http-request</code>、<code>image-compress</code></td>
          </tr>
          <tr>
            <td>输出 / 展示</td>
            <td><code>text-display</code>、<code>image-preview</code>、<code>human-review</code></td>
          </tr>
          <tr>
            <td>容器</td>
            <td><code>folder</code>、<code>img-folder</code></td>
          </tr>
        </tbody>
      </table>
      <p class="help-section__p" style="margin-top: 8px;">
        左侧「节点帮助」列表里列出了当前已注册帮助文档的节点，点击可查看详细用法。
      </p>
    </section>
  </div>
</template>

<style scoped lang="less">
.help-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.help-section {
  &__title {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
    padding-bottom: 6px;
    border-bottom: 1px solid #f3f4f6;
  }

  &__p {
    margin: 0;
    font-size: 12px;
    line-height: 1.7;
    color: #4b5563;

    code {
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 3px;
    }

    b {
      color: #1f2937;
    }
  }
}

.help-concept {
  padding: 8px 0;
  border-bottom: 1px dashed #f3f4f6;

  &:last-child {
    border-bottom: none;
  }

  &__name {
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 2px;
  }

  &__desc {
    font-size: 12px;
    line-height: 1.7;
    color: #4b5563;

    code {
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 3px;
    }
  }
}

.help-list {
  margin: 6px 0 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.8;
  color: #4b5563;

  &--ordered {
    list-style: decimal;
  }

  li {
    code {
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 3px;
    }
  }
}

.help-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th, td {
    padding: 6px 10px;
    text-align: left;
    border-bottom: 1px solid #f3f4f6;
  }

  th {
    font-weight: 600;
    color: #374151;
    background: #f9fafb;
    font-size: 11px;
    width: 80px;
  }

  td {
    color: #4b5563;

    code {
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #b91c1c;
      background: #fef2f2;
      border-radius: 3px;
    }
  }
}
</style>
