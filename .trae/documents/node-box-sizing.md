# Node 基类新增宽高 box（硬约束）方案

## Context（为什么改）

`Node` 基类目前只持有 `positionValue`（点位），节点在画布上的**宽/高没有引擎数据**——宽度散落在各 `render.vue` 的 CSS `width`，高度随内容撑开，渲染层靠 `elements.ts` 用 DOM `offsetWidth/offsetHeight` 实测（`measureNodeBox` + ResizeObserver）。

诉求：让 `Node` 像持有 position 一样持有 box（宽高）。每个具体节点类按自身需求声明内容区宽高，画布以这个 box 作为**硬约束**渲染 `render.vue`（内容在框内自适应/裁剪，不超出）。

已与用户确认两条口径：
1. **box = 仅中间内容区**：NodeShell 三列结构（左端口列 20px + 中间 content + 右端口列 20px），`node.width/height` 只描述内容区；外壳总宽 = box 宽 + 40px，总高 = box 高。
2. **硬约束**：内容区严格取 `node.width/height`，`render.vue` 在框内自适应填满，超出裁剪。

## 核心设计原则

**轴级 "0 = 不受约束"**：`box = [width, height]`，任一维为 0 表示「该轴不约束、沿用今天的随内容撑开」。
- 未迁移节点 `box=[0,0]`，行为与现状逐字节一致 → 可逐个节点搬、搬一个验一个，不用一次性全改。
- 这同时化解了 ImgFileNode 高度随图片比例、无法硬盒化的问题（高度维保持 0 = auto）。

**持久化**：box 不在基类落库（不加 DB 列）。多数节点的 box 是类声明的静态默认（构造时 setBox 一次）。用户可调的宽（ImgFileNode）仍走现有的 `params`（saveState/readState），不新增持久化字段。

## 实施步骤

### P1：系统接线（零行为变化，必做）

**`src/main/engine/node/Node.ts`** — 完全照 position 模式加 box：
```ts
private boxValue: [number, number] = [0, 0]

get box(): readonly [number, number] { return this.boxValue }

setBox(width: number, height: number): void {
  const w = Math.max(0, Math.round(width))
  const h = Math.max(0, Math.round(height))
  if (w === this.boxValue[0] && h === this.boxValue[1]) return
  this.boxValue = [w, h]
  this.notifyChanged()
}
```
求整为避免 sub-pixel 抖动；`notifyChanged()` 作为尺寸变化的引擎信号。

**`src/renderer/src/composables/useNodePosition.ts`** — 给 `NodeLike` 接口追加 `readonly box`（`get box()` 是 public 只读，跨编译单元结构判等没问题，与 position 同理）。NodeShell 已用 `NodeLike & PortsOwnerLike`，自动获得 box，零额外接线。

**`src/renderer/src/components/NodeShell.vue`** — box 进响应式并作为内容区硬约束：
- 加 `box` ref，在订阅 `node.onChanged` 时镜像 `box.value = props.node.box`（与 position 同步刷）。
- `contentStyle` computed：`width/height` 仅在对应维 `>0` 时给 `${n}px`，否则 undefined。
- 模板给 `.node-content` 挂 `:style="contentStyle"`。
- CSS：`.node-content` 加 `overflow: hidden; box-sizing: border-box;`。外壳总宽 = content + ports(40px)、总高 = box 高（flex align-items:stretch 自动达成）。
- `measurePortCenter` 仍读真实 DOM，端口 y 位置自动落在新框内，**无需修改**。

**`src/renderer/src/canvas/elements.ts`** — `measureNodeBox` 加可选 box 实参，双轴全非 0 时走确定性：
```ts
const PORT_COLS_WIDTH = 40
export function measureNodeBox(id, position, box?) {
  if (box?.[0] > 0 && box?.[1] > 0) {
    return { x: position[0], y: position[1], width: box[0] + PORT_COLS_WIDTH, height: box[1] }
  }
  // 现状兜底：box 缺轴或未设
  const el = nodeElements.get(id)
  return { x: position[0], y: position[1],
           width: el?.offsetWidth || FALLBACK_NODE_SIZE.width,
           height: el?.offsetHeight || FALLBACK_NODE_SIZE.height }
}
```
两个调用点补传 `node.box`：`edges.ts` 的 `portAnchor`、`Minimap.vue` 的 `nodeBoxes`。
**ResizeObserver 保留**：`measurePortCenter` 仍读 DOM、且 box 变化要先经 DOM 刷新才能让端口 y 对齐，仍需它触发重算。

### P2：通跑一个（TextInputNode）

**`src/main/nodePlugin/TextInputNode/node.ts`** — `constructor` 加 `this.setBox(220, 86)`（内容高 ≈ 手柄+gap+输入框+padding）。

**`src/main/nodePlugin/TextInputNode/render.vue`** — 根元素 `.node` 从 `width:220px` 改为填满 + 各自 overflow：
```less
.node { box-sizing: border-box; width: 100%; height: 100%; overflow: auto; ... }
```
（`box-sizing:border-box` 必须，让 border+padding 算在 box 内，否则横向溢出且数据不一致。）

### P3：逐个迁移其它节点

通用配方同 P2（node.ts 设 box + render.vue 根元素 fill + overflow）。overflow 策略：可变文本类（TextDisplay、FileInfo）→ `auto`；固定内容类 → `hidden` 保底。每个自测后再下一个。涉及：NumberInputNode、TextDisplayNode、FileInfoNode、TxtFileNode、AnyFileNode、ImagePreviewNode（宽 240）。

### P4：ImgFileNode 调和（宽度晋升进 box，高度保持 auto）

**`src/main/nodePlugin/ImgFileNode/node.ts`** — 用 box 宽度取代 `previewWidthValue`（唯一真相源 = box[0]）：
- `get previewWidth()` → `return this.box[0] || DEFAULT_PREVIEW_WIDTH`
- `setPreviewWidth(w)` → `this.setBox(clamped, this.box[1])`，clamped 夹在 [MIN, MAX]
- `constructor` → `this.setBox(DEFAULT_PREVIEW_WIDTH, 0)`（高维 auto）
- `saveState`/`readState` 照旧读写 `previewWidth` 字段（走 params，不动 DB）；`setNaturalSize`/`naturalWidth/Height` 保持原样，高度不参与 box。

**`src/main/nodePlugin/ImgFileNode/render.vue`** — 根 `.file-card` 去掉 `:style="{width: previewWidth+'px'}"`，改 `width:100%; box-sizing:border-box; height:auto`；resize handle 逻辑不变（`setPreviewWidth` → box 变 → NodeShell 镜像 → 全线自动跟随）。长名已 nowrap+ellipsis，不会爆宽。

### P5（可选，本轮不做）
- ports-col `min-width:20px` → `width:20px` 加固（现 label 都短，先不动）。
- img 高度硬盒化（需 `setNaturalSize` 加 notifyChanged，且引擎算的高与 CSS 盒易差 1-2px，成本高）。

## 关键文件
- `src/main/engine/node/Node.ts`（P1）
- `src/renderer/src/composables/useNodePosition.ts`（P1）
- `src/renderer/src/components/NodeShell.vue`（P1）
- `src/renderer/src/canvas/elements.ts`、`src/renderer/src/canvas/edges.ts`、`src/renderer/src/components/Minimap.vue`（P1）
- `src/main/nodePlugin/TextInputNode/node.ts` + `render.vue`（P2 通跑）
- 其余 nodePlugin/*/node.ts + render.vue（P3 逐个）
- `src/main/nodePlugin/ImgFileNode/node.ts` + `render.vue`（P4）

## 验证
- `npm run typecheck`（含 vue-tsc）——最关键一步：能验证 `NodeLike.box` 扩展是否解决跨编译单元结构判等（加错 private/public 会标红）。
- `npm run dev` 起 Electron 手动验证：
  - 已迁移节点：内容框被 box 裁住无溢出；外壳右缘 = 内容框 + 40px；连线落端口圆点、缩放不偏。
  - 小地图：boxed 节点矩形为确定性 box+40（不再依赖 DOM 时序）。
  - img：拖 handle 变宽、开关文件后宽度 keep、冷启后仍保持上次值；宽时端口 y 正确、线跟上。
  - 未迁移节点（box=[0,0]）：行为与改之前完全一致（回归锚点）。