<template>
  <div class="help-body">
    <!-- 什么是代码节点 -->
    <section class="help-section">
      <h4 class="help-section__title">这是什么？</h4>
      <p class="help-section__p">
        代码节点让你在画布上写一段 JavaScript 函数体，点击「执行」跑一次，
        通过 <code>callOutputPort</code> 把结果发给下游节点。
        输入端口的变量名在函数体里可以直接当变量用。
      </p>
    </section>

    <!-- 输入端口 -->
    <section class="help-section">
      <h4 class="help-section__title">输入端口</h4>
      <p class="help-section__p">
        点「输入」右侧的 <code>+</code> 添加端口，每个端口配置：
      </p>
      <ul class="help-list">
        <li><b>变量名</b>：函数体里直接用的标识符，例如 <code>price</code>、<code>items</code></li>
        <li><b>类型</b>：决定接受上游哪种值，代码里拿到的是原始 JS 值</li>
      </ul>
      <table class="help-table">
        <thead><tr><th>类型</th><th>代码里拿到什么</th></tr></thead>
        <tbody>
          <tr><td><code>number</code></td><td>原始数字，如 <code>42</code></td></tr>
          <tr><td><code>string</code></td><td>原始字符串，如 <code>"hello"</code></td></tr>
          <tr><td><code>bool</code></td><td>原始布尔值，如 <code>true</code></td></tr>
          <tr><td><code>file</code></td><td>浏览器 <code>File</code> 对象（可读 <code>.name</code>、<code>.size</code>）</td></tr>
        </tbody>
      </table>
    </section>

    <!-- 输出端口 -->
    <section class="help-section">
      <h4 class="help-section__title">输出端口</h4>
      <p class="help-section__p">
        点「输出」右侧的 <code>+</code> 添加端口（至少保留一个），每个端口配置：
      </p>
      <ul class="help-list">
        <li><b>端口名</b>：<code>callOutputPort</code> 里用的第一个参数，如 <code>"result"</code></li>
        <li><b>类型</b>：决定接受的输出值类型，会自动做校验和转换</li>
      </ul>
    </section>

    <!-- callOutputPort 语法 -->
    <section class="help-section">
      <h4 class="help-section__title">callOutputPort 语法</h4>
      <pre class="help-code"><code>callOutputPort(<span class="c-str">"端口名"</span>, <span class="c-val">值</span>)</code></pre>
      <p class="help-section__p">
        一次执行里可以调多次，向不同端口各提一次，也可以向同一端口连续提多次（后一次覆盖前一次）。
      </p>
    </section>

    <!-- 示例 -->
    <section class="help-section">
      <h4 class="help-section__title">示例</h4>

      <div class="help-example">
        <div class="help-example__label">例 1：两个 number 输入 → 一个乘积输出</div>
        <pre class="help-code"><code><span class="c-comment">// 输入端口: price (number), qty (number)</span>
<span class="c-comment">// 输出端口: result (number)</span>
<span class="c-func">callOutputPort</span>(<span class="c-str">"result"</span>, price <span class="c-op">*</span> qty)</code></pre>
      </div>

      <div class="help-example">
        <div class="help-example__label">例 2：一次执行向多个输出端口提交</div>
        <pre class="help-code"><code><span class="c-comment">// 输出端口: port1 (number), port2 (string)</span>
[<span class="c-num">1</span>, <span class="c-num">2</span>, <span class="c-num">3</span>, <span class="c-num">4</span>].forEach(<span class="c-ident">v</span> <span class="c-op">=></span> {
  <span class="c-func">callOutputPort</span>(<span class="c-str">"port1"</span>, v)
  <span class="c-func">callOutputPort</span>(<span class="c-str">"port2"</span>, String(v))
})</code></pre>
      </div>

      <div class="help-example">
        <div class="help-example__label">例 3：兼容旧写法——直接 return（只提交到第一个输出端口）</div>
        <pre class="help-code"><code><span class="c-comment">// 输出端口: result (number)</span>
<span class="c-kw">return</span> [<span class="c-num">1</span>, <span class="c-num">2</span>, <span class="c-num">3</span>].<span class="c-func">reduce</span>((<span class="c-ident">a</span>, <span class="c-ident">b</span>) <span class="c-op">=></span> a <span class="c-op">+</span> b, <span class="c-num">0</span>)</code></pre>
      </div>

      <div class="help-example">
        <div class="help-example__label">例 4：读取 File 对象属性</div>
        <pre class="help-code"><code><span class="c-comment">// 输入端口: f (file)</span>
<span class="c-comment">// 输出端口: name (string), size (number)</span>
<span class="c-func">callOutputPort</span>(<span class="c-str">"name"</span>, f.name)
<span class="c-func">callOutputPort</span>(<span class="c-str">"size"</span>, f.size)</code></pre>
      </div>
    </section>

    <!-- 异步说明 -->
    <section class="help-section">
      <h4 class="help-section__title">异步 &amp; await 都能 work</h4>
      <p class="help-section__p">
        代码节点用 <code>AsyncFunction</code> 构造函数体，所以可以<b>直接写 <code>await</code></b>，
        也可以用 <code>setTimeout</code> / <code>setInterval</code> 做延迟输出。
        <code>callOutputPort</code> 的回调引用一直活着，<b>任何时机</b>的调用都能正常触发下游端口 commit。
      </p>

      <div class="help-example">
        <div class="help-example__label">用 await 串行等待</div>
        <pre class="help-code"><code><span class="c-func">callOutputPort</span>(<span class="c-str">"result"</span>, <span class="c-str">"11a"</span>)
<span class="c-kw">await</span> <span class="c-func">new</span> Promise(resolve <span class="c-op">=></span> <span class="c-func">setTimeout</span>(resolve, <span class="c-num">1000</span>))
<span class="c-func">callOutputPort</span>(<span class="c-str">"port2"</span>, <span class="c-str">"22b"</span>) <span class="c-comment">// 等 1 秒后才 commit</span></code></pre>
      </div>

      <div class="help-example">
        <div class="help-example__label">用 setTimeout 延迟（不阻塞同步代码）</div>
        <pre class="help-code"><code><span class="c-func">callOutputPort</span>(<span class="c-str">"result"</span>, <span class="c-str">"11"</span>)
<span class="c-func">setTimeout</span>(() <span class="c-op">=></span> {
  <span class="c-func">callOutputPort</span>(<span class="c-str">"port2"</span>, <span class="c-str">"33"</span>) <span class="c-comment">// 1 秒后 commit，不阻塞下面这行</span>
}, <span class="c-num">1000</span>)
<span class="c-func">callOutputPort</span>(<span class="c-str">"port2"</span>, <span class="c-str">"22"</span>) <span class="c-comment">// 先 commit port2=22，1 秒后被 33 覆盖</span></code></pre>
      </div>

      <p class="help-section__p help-section__p--warn">
        同一个端口被多次 <code>callOutputPort</code> 调用时，后一次会覆盖前一次（端口值按指纹比对）。
        下游节点会跟着最新值刷新。
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
  .c-str     { color: #86efac; }
  .c-val     { color: #fde68a; }
  .c-num     { color: #fbbf24; }
  .c-func    { color: #60a5fa; }
  .c-kw      { color: #f472b6; font-weight: 500; }
  .c-ident   { color: #e2e8f0; }
  .c-op      { color: #94a3b8; }
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
