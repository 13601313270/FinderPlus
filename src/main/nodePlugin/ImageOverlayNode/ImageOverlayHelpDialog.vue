<template>
  <div class="help-body">
    <!-- 什么是图片叠加节点 -->
    <section class="help-section">
      <h4 class="help-section__title">这是什么？</h4>
      <p class="help-section__p">
        图片叠加节点把多张图片按<b>图层顺序</b>叠在一起，合成一张 PNG（保留透明通道），
        从右侧 <code>composite</code> 端口输出给下游节点。
        每个输入端口接一张图，接到端口上的图可以在节点右侧的预览区里自由拖拽定位、拉伸缩放。
      </p>
    </section>

    <!-- 输入端口 -->
    <section class="help-section">
      <h4 class="help-section__title">输入端口（图层）</h4>
      <ul class="help-list">
        <li>初始有 <b>2 个</b>输入端口，每个端口接一张图</li>
        <li>所有端口都被占满时，会<b>自动新增</b>一个端口；也可以点左侧的「＋ 添加图层」手动加</li>
        <li>端口顺序 = 图层顺序：<code>图层 1</code> 在最底层，序号越大越靠上（后画的盖住先画的）</li>
        <li>每个端口只能接一张图，接入类型为图片值（<code>img-file</code> 节点或上游图片输出）</li>
        <li>只有<b>最后一个</b>已连接的端口能删除（列表里的 <code>×</code>），且至少保留 1 个图层</li>
      </ul>
      <p class="help-section__p help-section__p--warn">
        图层顺序由端口顺序决定，<b>不能直接拖动调整</b>。想换层序需要重新接线，或删掉尾部端口后重连。
      </p>
    </section>

    <!-- 定位与缩放 -->
    <section class="help-section">
      <h4 class="help-section__title">定位与缩放</h4>
      <ul class="help-list">
        <li>点左侧图层条目、或点预览区里的图片，即可<b>选中</b>该图层（出现蓝色边框）</li>
        <li>选中后<b>拖动图片</b>即可移动位置，坐标以合成画布左上角为原点</li>
        <li>选中后四角出现蓝色手柄，<b>拖动手柄</b>拉伸缩放；按住 <code>Shift</code> 可等比缩放</li>
        <li>新接入的图会按<b>原始像素尺寸</b>初始化位置和大小；手动调整过之后不会再被自动覆盖</li>
        <li>点预览区空白处可取消选中</li>
      </ul>
    </section>

    <!-- 画布尺寸 -->
    <section class="help-section">
      <h4 class="help-section__title">画布尺寸（右上角齿轮）</h4>
      <table class="help-table">
        <thead><tr><th>模式</th><th>含义</th></tr></thead>
        <tbody>
          <tr><td><b>自动</b></td><td>按所有图层的右边界 / 下边界自动算出画布大小</td></tr>
          <tr><td><b>固定尺寸</b></td><td>手动指定宽高，超出画布范围的内容会被裁掉</td></tr>
        </tbody>
      </table>
      <p class="help-section__p" style="margin-top: 8px;">
        弹窗里的「恢复自动」按钮可随时切回自动模式。
      </p>
    </section>

    <!-- 输出 -->
    <section class="help-section">
      <h4 class="help-section__title">输出</h4>
      <ul class="help-list">
        <li>右侧 <code>composite</code> 端口输出合成后的 PNG，保留透明通道</li>
        <li>底部「生成图片文件节点」会把当前合成结果落成一个 <code>img-file</code> 节点，方便继续串下游</li>
        <li>图层或变换改动后会有约 150ms 的防抖，稳定后才重新合成</li>
      </ul>
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
</style>