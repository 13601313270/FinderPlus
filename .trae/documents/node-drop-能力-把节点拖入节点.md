# 能力：把节点拖入另一个节点（Node-to-Node Drop）

> 状态：✅ 已实现（增量1-5 全部完成）。首个落地节点 ImageCompressNode（src/main/nodePlugin/ImageCompressNode/）已注册进 nodePlugin/index.ts，typecheck 双端全绿。悬停高亮按用户要求暂不做，引擎悬停态方法保留未参与运行路径。

## Context（为什么做这个改动）

项目目前支持「文件拖入画布、命中节点时由节点决定是否劫持」（`onFileDragOver/onFileDrop` + 悬停态）。用户需要一类**类似但对称**的能力：把一个**已有节点**拖到另一个节点上，目标节点选择「接受」被拖节点。

首个落地场景：**图片压缩节点**。用户把**图片文件节点**（ImgFileNode）拖到压缩节点上，压缩节点读取该图片的输出（ImgFileValue → File），压缩/缩小后，向**自己的输出端口**提交一张更小的新图片（ImgFileValue），可继续连线给下游（如 ImagePreviewNode）。

用户确认的语义：
- 行为 = 目标节点接收的是**被拖的 Node 实例本身**（一个活的引用），而不是只读取那一刻的输出数据——目标持引用并**实时订阅该节点**，从这个实例的输出端口读数据做后续处理；
- 手势区分 = 拖拽落点命中目标节点（命中且目标愿意接受则接管，否则就是普通移动）；
- 位置归属 = 被拖节点**仍独立存在**在落点（move 已 setPosition 过，结算不还原）。

## 目标流程

```
拖住节点A(图片节点) → 划过节点B(压缩节点)：
  B.testAcceptNodeDrop(A) 命中 → B 显示 node-drop 悬停高亮，不再视为普通移动
  → pointerup 落点仍在 B 内：App 调 B.onNodeDrop(A)
    → B 记录绑定 source=A.id，订阅 A.onChanged → notifyChanged
    → render.vue 察觉新绑定，读 A 输出的 ImgFileValue.file（File，字节）
    → drawImage 到 <canvas> → toDataURL 缩小 → base64 → 新 File → 调 node.setOutput(b64)
    → node.commit(new ImgFileValue) 到压缩节点输出端口 → 下游刷新
被拖节点A 留在原落点不动
```

## 改动清单

### 1. 引擎：Node 基类新增 node-drop 钩子 + 悬停态
文件：`src/main/engine/node/Node.ts`

**用独立字段，不跟文件悬停态共用**（UI 高亮要不同颜色）。全部**非 abstract 默认 no-op**，避免给 9 个子类塞空实现（node-drop 是 opt-in，目前只有压缩节点要）。命名与文件版对称：

```ts
/** 目标节点判断是否接受某个被拖节点。默认拒绝。 */
isPositionAcceptNodeDrop(_source: Node): boolean { return false }
/** drop 结算：目标节点收到被拖节点，返回是否接管。默认不接管。 */
onNodeDrop(_source: Node): boolean { return false }

// 悬停态（仿 isInFileDropZoneValue 模式，独立字段）
get isInNodeDropZone(): boolean
protected setIsInNodeDropZoneValue(v: boolean): void   // 有变化才写+notify
/** 接受判定 + 悬停态联动，返回是否接受。App 拖拽 move 时对候选目标调用 */
testAcceptNodeDrop(source: Node): boolean
/** 渲染层/清理用：清除悬停态 */
clearNodeDropActive(): void
```

`testAcceptNodeDrop(source)` 内部：`const ok = this.isPositionAcceptNodeDrop(source)`，`ok !== isInNodeDropZoneValue` 时 `setIsInNodeDropZoneValue`，return ok。

### 2. 引擎 bug 收敛：FileNode 基类补 onFileDrop no-op
文件：`src/main/nodePlugin/FileNode/node.ts`

现状 `Node` 把 `onFileDrop(sourcePath)` 定为 abstract，`FileNode` 只 override 了 `isPositionAcceptFileDrop`,导致 `AnyFileNode`/`TxtFileNode` 未实现抽象成员、**typecheck 已挂**。在本改动里一并收敛为「基类给默认拒绝」：
- `FileNode` 补 `onFileDrop(_sourcePath: string): void {}` no-op。
- 现有子类未用参数（TS6133）加 `_` 前缀，或保持 abstract 由子类实现——采用**基类 no-op 默认实现**方案（最小改动，收敛破坏状态）。

### 3. 渲染端：useNodePosition 记录「当前被拖节点」
文件：`src/renderer/src/composables/useNodePosition.ts`

- **被拖节点 A 完全不感知投放语义**：删掉第三参 `NodeDropOpts`，签名恢复 `useNodePosition(getNode, dragOutOpts?)`。
- 模块级单例 `draggingNode`：`startDrag` 时记录 `draggingNode = lastNode`；导出 `getDraggingNode()`（App 松手结算读取）和 `clearDraggingNode()`（App 结算后统一清，useNodePosition 不负责，避免与 App 的 pointerup 处理器触发顺序互踩）。
- `NodeLike` 增只读 `id: string`——App 结算时用它从 `workspaceScene.getNode(id)` 找回真实 `Node` 实例（`NodeLike` 不是 `Node`，而 `onNodeDrop(source: Node)` 需要 Node）。
- `useNodePosition` 不处理任何悬停态高亮；拖拽过程中的 hover 外观反馈**暂不做**，后期需要时再加「dragover 命中 → 节点悬停态 → render.vue 自绘高亮」链路（引擎层 `isInNodeDropZone`/`testAcceptNodeDrop` 已就绪，届时复用）。

### 4. App.vue：松手全局结算
文件：`src/renderer/src/App.vue`

- 常驻 `window.addEventListener('pointerup', onGlobalPointerUp)`（onMounted 注册、onUnmounted 移除；先于 useNodePosition 拖拽时临时注册的 handler 执行，故能读到 draggingNode）。
- `onGlobalPointerUp(e)`：读 `getDraggingNode()` → 用 `dragged.id` 从 Scene 找回真实 Node → `screenToWorld(clientX - canvasRect.left, ...)` 算世界坐标 → 遍历 `allNodes` 框命中（box+position，排除自身，轴为 0 跳过）→ 命中则 `node.isPositionAcceptNodeDrop(draggedNode)` 通过后 `node.onNodeDrop(draggedNode)`（一次性工作，被拖节点留在落点不还原）→ `finally { clearDraggingNode() }`（无论是否命中，松手即清）。
- NodeShell 无需任何改动（useNodePosition 回到两参，不涉及投放）。

### 5. 新插件：图片压缩节点 CompressNode
目录：`src/main/nodePlugin/ImageCompressNode/`（`index.ts` + `node.ts` + `render.vue`），manifest 注册进 `nodePlugin/index.ts` 的 `functionalManifests`（在 ImagePreviewNode 附近），调色板自动出现。

`node.ts`：
- `type = 'image-compress'`；输出端口 `output = new OutputPort('image', ImgFileValue, '压缩图')`；`setBox` 定内容区。
- `isPositionAcceptNodeDrop(source)`：`source.outputPorts.some(p => p.valueClass === ImgFileValue)` → 接受。
- `onNodeDrop(source)`：**一次性工作，不建立持久关系**——不订阅 source、不存绑定 id、不持久化。只把本次要处理的源节点暂存到 `pendingSourceId`（临时字段，仅作「通知 render.vue 干活」的触发信号），`notifyChanged()`，返回 true。
- `get pendingSource()`：`workspaceScene.getNode(pendingSourceId)`。
- `clearPending()`：清空 pendingSourceId + notifyChanged（render.vue 干完活后调用，重置触发信号）。
- `setOutput(base64)`：仿 ImgFileNode.setContent —— base64ToBytes → File → djb2 hash → `commit(new ImgFileValue(file, hash))` + notifyChanged（render.vue 提交压缩结果）。
- `saveState/readState`：返回空对象（一次性工作，无持久状态；恢复后不自动重压，等用户再拖一次）。

`render.vue`（压缩逻辑在浏览器侧，引擎不碰字节）：
- 订阅 node.onChanged；watch `pendingSource` 变化：读到非空 → 执行**一次**压缩 → 完成后调 `node.clearPending()`（重置触发信号）。
- 压缩动作：读源节点输出 `ImgFileValue.file`（File，字节）→ 用 `URL.createObjectURL`/`Image` 加载 → `drawImage` 到 `<canvas>` 按比例缩小（如最长边 ≤ 目标值）→ `canvas.toDataURL(mime, quality)` → 抽 base64 → `node.setOutput(b64)`。
- 无源/源无图时显示占位 + 提示「拖入图片节点」。

复用：`ImgFileValue`/`FileValue.file` 现存；`base64ToBytes`(`engine/data/base64`)、`djb2`(`engine/data/hash`)、`inferImageMime`(`ImgFileNode/mime`) 皆可直接引用。

## 需要确认的技术点（实现时）
- 压缩比例/质量参数：先用固定策略（保留源宽高的某个比例或最长边上限），可后续做成节点 UI 参数。计划先不做可调参数，保持最小。

## 复用清单
- 框命中测试：复用 App.vue 现有文件拖入的几何判定写法（box+position 矩形）。
- 悬停态模式：完全照抄 `testIsInFileDropZone/isInFileDropZoneValue/setIsInFileDropZoneValue` 的模式做 node-drop 独立版本。
- 提交输出：ImgFileNode.setContent 的 base64→File→hash→commit 链路。
- useNodePosition 的 onChanged 推送 + NodeLike 最小接口（沿用，符合 vue-tsc 约束）。

## 验证（端到端）
1. `npm run typecheck` 通过（含修复 FileNode onFileDrop 后 AnyFileNode/TxtFileNode 错误消失）。
2. `npm run dev` 启动：
   - 调色板出现「图片压缩」节点；拖入到画布放置。
   - 拖一个 ImgFileNode 划过压缩节点 → 压缩节点出现 node-drop 高亮；划走 → 高亮消失。
   - 把 ImgFileNode 松手在压缩节点上 → 压缩节点预览出现**更小**的图片；连接 压缩.output → ImagePreviewNode.input → 预览同步显示压缩后小图。
   - 再次把同一个/另一个 ImgFileNode 拖入 → 压缩结果更新为新的（**一次性**：拖一次压一次，不自动跟随源变化）。
   - 删除压缩节点无泄漏、无报错；拖到画布外（dragbar）松手 → 无 node-drop 高亮残留。
3. 回归：普通节点拖拽移动仍然正常（不命中压缩节点时就是纯移动）。