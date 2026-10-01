<template>
  <div class="help-body">
    <!-- 什么是 HTTP 请求节点 -->
    <section class="help-section">
      <h4 class="help-section__title">这是什么？</h4>
      <p class="help-section__p">
        HTTP 请求节点把一条常发的 HTTP / HTTPS 请求<b>保存</b>在节点里，点「发送」执行一次，
        响应体（字符串）从右侧 <code>text</code> 端口发给下游节点。
        请求在主进程发出，因此<b>不受渲染进程 CORS 限制</b>，内网服务、自签证书的地址也能访问。
      </p>
    </section>

    <!-- 展开 / 收起 -->
    <section class="help-section">
      <h4 class="help-section__title">展开 / 收起</h4>
      <ul class="help-list">
        <li><b>折叠态</b>：只显示「方法 + URL」预览、headers/body 摘要、结果区、发送按钮</li>
        <li><b>展开态</b>：点头部的「展开」，额外显示方法下拉、URL 输入、Headers、Body、超时、端口增删</li>
        <li>所有编辑控件都是<b>改了直接写回节点</b>，没有草稿态，也不需要额外的保存动作</li>
        <li>折叠状态会随场景一起保存，重新打开时保持原样</li>
      </ul>
    </section>

    <!-- 输入端口与 $N 模板 -->
    <section class="help-section">
      <h4 class="help-section__title">输入端口 &amp; $N 模板</h4>
      <p class="help-section__p">
        URL、Headers 的 key / value、Body 都是<b>模板</b>：用 <code>$1</code> <code>$2</code>
        <code>$3</code> … 引用第 N 个字符串输入端口的值，执行时拼成最终内容。
      </p>
      <ul class="help-list">
        <li>端口默认 1 个，标签就是 <code>$1</code>、<code>$2</code>…；只接受<b>字符串</b>类型的值</li>
        <li>所有端口都被占满时会<b>自动新增</b>一个端口；也可以点展开态里的 <code>＋</code> / <code>－</code> 手动增删</li>
        <li>只能删<b>末尾</b>端口，且至少保留 1 个</li>
        <li>占位符没有对应端口、或该端口当前没值时，替换为<b>空串</b></li>
        <li>想输出字面量的 <code>$</code>，写成 <code>$$</code></li>
      </ul>
      <div class="help-example">
        <div class="help-example__label">例：$1 是用户 id，$2 是 token</div>
        <pre class="help-code"><code><span class="c-comment">// URL 模板</span>
https://api.example.com/users/<span class="c-val">$1</span>

<span class="c-comment">// Headers 里的一条</span>
Authorization: Bearer <span class="c-val">$2</span></code></pre>
      </div>
    </section>

    <!-- 方法 / Headers / Body / 超时 -->
    <section class="help-section">
      <h4 class="help-section__title">请求配置</h4>
      <table class="help-table">
        <thead><tr><th>项</th><th>说明</th></tr></thead>
        <tbody>
          <tr>
            <td><b>方法</b></td>
            <td><code>GET</code> / <code>POST</code> / <code>PUT</code> / <code>DELETE</code> / <code>PATCH</code> / <code>HEAD</code></td>
          </tr>
          <tr>
            <td><b>Headers</b></td>
            <td>KV 列表逐条编辑；<b>key 为空</b>的条目会被跳过，value 允许空串</td>
          </tr>
          <tr>
            <td><b>Body</b></td>
            <td><code>GET</code> / <code>HEAD</code> 不带 body（输入框置灰，执行时也跳过）；其余方法原样发送</td>
          </tr>
          <tr>
            <td><b>超时</b></td>
            <td>毫秒，取值会被夹到 <code>1000</code>–<code>60000</code>，默认 <code>15000</code></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 执行与结果 -->
    <section class="help-section">
      <h4 class="help-section__title">执行与结果</h4>
      <ul class="help-list">
        <li>点「发送」执行，URL 为空时按钮不可点</li>
        <li>执行中按钮显示「发送中…」，同一个节点不会并发重复触发</li>
        <li>返回后结果区显示<b>状态码 + 响应体</b>，并同时把响应体提交到输出端口</li>
        <li>HTTP <b>4xx / 5xx 也算请求完成</b>：状态码用告警色显示，响应体照样发给下游</li>
        <li>只有网络层失败（DNS 解析失败、超时、断网等）才标红为「网络错误」，此时<b>不提交</b>输出值</li>
      </ul>
      <p class="help-section__p help-section__p--warn">
        每点一次「发送」就是一次<b>真实的网络请求</b>，节点不做任何缓存或去重。对接会产生副作用的接口（下单、发消息等）时注意。
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
    line-height: 1.6;
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

    &--warn {
      margin-top: 8px;
      padding: 8px 10px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      color: #92400e;
      font-size: 11px;

      code {
        color: #b45309;
        background: #fef3c7;
      }
    }
  }
}

.help-list {
  margin: 6px 0 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.7;
  color: #4b5563;

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
  margin-top: 8px;
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

.help-code {
  margin: 8px 0;
  padding: 10px 12px;
  background: #1e293b;
  border-radius: 6px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  line-height: 1.6;

  code {
    color: #e2e8f0;
    background: none;
    padding: 0;
  }

  .c-comment { color: #94a3b8; font-style: italic; }
  .c-val     { color: #fde68a; }
}

.help-example {
  &__label {
    font-size: 11px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 2px;
  }

  + & {
    margin-top: 4px;
  }
}
</style>