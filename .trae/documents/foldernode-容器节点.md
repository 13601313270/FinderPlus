# FolderNode 文件夹容器节点 — 实现计划

## Context

画布需要一种「文件夹」节点：把若干文件拖进去就能自动生成对应的文件子节点（TxtFileNode/ImgFileNode/AnyFileNode），也可把子节点拖出释放。文件夹尺寸可调、最小 2×2 槽位。**核心诉求是「拖进去后子节点原有的 Edge 链接保持可用」**——这决定了方案必须走**同一扁平 Scene 的收养模型**：边按端口对象引用连接，与坐标/归属无关，因此收养/释放都不破坏任何边。

已确认决策：
- 容器模型 = 同场景收养（子节点仍在 `workspaceScene`，世界坐标）
- 子节点呈现 = 复用 NodeShell 的「完整小节点」（含端口列）
- 删除文件夹 = `beforeDestroy` 先释放全部子节点回画布，边保留

## 核心设计

不新增布局框架，`FolderNode` 是一个继承 `Node` 的节点类，让子节点留在同一扁平 Scene。对 `Node` 基类做最薄的改动：加一个只读 `containerNode?: Node` 字段标记收养归属（孤儿为 undefined）。

**文件字节归属（用户确认）**：文件夹纯粹是 UI 组合功能——节点还是那个节点，文件还是那个文件。文件夹**不落盘、不复制、不重建 Value**；文件字节的复制仍只在「从调色板/画布正常创建文件节点」时走既有 copyPath 路径。因此文件夹收养一律基于「已有文件节点 / 已有文件值」，不产生新的画布副本。

三个收养入口汇到同一个 `addChild` 核心：
1. 输入端口收值（`onInputChanged` → `resolveByValueClass` → 构造子节点 → `setFile` 沿用已有 fileName → `addChild`）
2. 文件拖入（`isPositionAcceptFileDrop`/`onFileDrop`）
3. 节点拖入（`isPositionAcceptNodeDrop`/`onNodeDrop` → `addChild(source)`，边自动保留）

## 实现步骤

### Step 0 — Node 基类加容器归属
`src/main/engine/node/Node.ts`：加 `readonly containerNode?: Node`。
- 选孤儿最简：一个只读字段，装载由 FolderNode 显式管理，不加 setter 派发。
- 用基 `Node` 类型（engine 层），FolderNode（nodePlugin 层）单向依赖 nodePlugin→engine，无环。
- 不新抽 ContainerNode 抽象基类——目前仅一个容器，抽象收益低于复杂度，出现第二个容器再重构。
- 不破坏 `NodeLike` 最小接口（id/position/box/setPosition/onChanged 成员子集，Node 多加字段不影响可赋值性）。

### Step 1 — FolderNode 类 + manifest + render.vue
新建 `src/main/nodePlugin/FolderNode/{node.ts, index.ts, render.vue}`。

栅格常量建议：
- `SLOT_W=96, SLOT_H=96, GAP=12, PADDING=20`
- 内容区尺寸由槽位数推导：`w = PADDING*2 + cols*(SLOT_W+GAP) - GAP`，`h` 同理
- 最小 2×2：`MIN_W = MIN_H ≈ 232`（PADDING*2 + 2*(SLOT_W+GAP)-GAP）

要点：
- 输入端口 `fileInput = new InputPort('file', FileValue, '文件')`，`accepts=[FileValue, TxtFileValue, ImgFileValue]`
- `children: Node[]`、去重指纹集、boxSize
- `saveState = { childIds: string[], box: [w,h] }`；`readState` 存 `pendingChildIds` + setBox
- `beforeDestroy()`：最前遍历 child 清 `containerNode`（释放回画布，边按端口引用保留），再 `super.beforeDestroy()`

### Step 2 — resolveByValueClass + FileNode.acceptsValue
`src/main/nodePlugin/FileNode/node.ts`：
```ts
static acceptsValue(_value: Value): boolean { return false }
```
- 收 value **实例**而非 class：`TxtFileValue instanceof FileValue` 天然成立，规避子类/父类判断
- 各子类 override：TxtFileNode→`v instanceof TxtFileValue`、ImgFileNode 同理、AnyFileNode→`return true`（兜底）

`src/main/nodePlugin/index.ts`：加 `resolveByValueClass(value): manifest | undefined`，单遍扫描 `nodeManifests`，匹配 `cls.prototype instanceof FileNode && (cls as typeof FileNode).acceptsValue(value)`。数组顺序天然保证 AnyFileNode 兜底收尾。

### Step 3 — 三个收养入口
文件夹内容区有边界（box 双轴>0），App.vue 的 `onCanvasDrop`/`onGlobalPointerUp` 命中测试自动适用，无需改命中。

- **onInputChanged**：读 `fileInput.value[0]`，FileValue 且指纹去重通过 → 用 `resolveByValueClass(value)` 构造对应文件子节点 → `setFile(value.file.name, value.file.size)`（沿用已有文件名，文件字节已在画布目录，**不落盘不复制**）→ `addChild`。原依附 value.file 的边（如上游 FileInfoNode）因子节点世界坐标正确仍指向其输出端口，保持可用。
- **文件拖入**：override `isPositionAcceptFileDrop`/`onFileDrop`。onFileDrop 由 App 传 `sourcePath` → `resolveByExtension` 找到承接的文件节点 manifest → 沿用 path、构造子节点 → `setFile` → `addChild`。文件复制仍走正常创建路径（懒初始化，未创建时不落盘）。保持「节点不碰 IPC」约定。
- **节点拖入**：`isPositionAcceptNodeDrop(source)` 返回 `source instanceof FileNode && !source.containerNode`；`onNodeDrop(source)` → `addChild(source)`（边自动保留）。

### Step 4 — addChild/removeChild + 槽位栅格
- `addChild(child)`：拒绝重复收养（`child.containerNode` 已存在则 return）→ 指纹去重 → `child.containerNode = this; children.push` → 算槽位世界坐标 `setPosition`。
- `removeChild(child)`：清 `containerNode`、剔除 children，保留当前世界坐标（释放即原地放回）。
- slot 换算：`slotX = position[0] + PADDING + col*(SLOT_W+GAP)`，col 由 `index % cols`、row 由 `floor(index/cols)` 推。

### Step 5 — setPosition 平移递归
override：算 `dx, dy` → `super.setPosition(x,y)` → `children.forEach(c => c.setPosition(c.position[0]+dx, c.position[1]+dy))`。子节点若又是 FolderNode 其 override 自然递归，无环。

### Step 6 — 尺寸可调 + 最小钳制
render.vue 东南角 resize 手柄 → `setBox(w,h)`。`setBox` override 钳制到 `MIN_W/MIN_H`。nodes 表无 box 列，尺寸经 saveState/readState 持久化（ImgFileNode 已示范同模式）。

### Step 7 — 拖出边界结算
App.vue `onGlobalPointerUp` finally 前追加：若 `draggedNode.containerNode` 存在，用松手世界坐标与 `measureNodeBox(holder...)` 判界（外扩 margin=12px），越界即 `holder.removeChild(draggedNode)` 原地放回。

### Step 8 — App.vue 改动
1. `nodes` computed 过滤：`allNodes.filter(n => !n.containerNode)`（避免子节点在顶层 NodeShell 双渲染）
2. `onGlobalPointerUp` 拖出边界结算（Step 7）
3. `bootstrapScene` 第 3 步 connect 之后、第 4 步 attachStorage 之前：遍历 folder 节点调 `adoptChildren(scene)`（按 pendingChildIds 用 `scene.getNode(id)` 收养，跳过缺失 id）
4. `index.ts` 注册 `folderManifest` 到 `functionalManifests`

## 潜在坑
- **vue-tsc 跨编译单元**：Node 加字段不破坏 NodeLike 子集赋值；FolderNode 用基 Node 类型避免反向依赖；render.vue 用 `instanceof FolderNode` 判定
- **async removeNode/beforeDestroy 时序**：释放子节点必须放 beforeDestroy 最前
- **子树注册快照**：Scene.allNodes 每次返回新数组，Minimap 会叠画两遍（位置相同可接受）；FolderNode.render 的 v-for children 需订阅 folder.onChanged 刷新
- **递归容器**：`setPosition`/`removeChild`/`adoptChildren` 都支持 child 为 FolderNode；收养去重防自环（拒绝 `source===this`、已收养、在自己的子树内）

## 改动文件清单
- `src/main/engine/node/Node.ts` — +containerNode 字段
- `src/main/nodePlugin/index.ts` — +resolveByValueClass、+folderManifest
- `src/main/nodePlugin/FileNode/node.ts` — +static acceptsValue
- `src/main/nodePlugin/TxtFileNode/node.ts`、`ImgFileNode/node.ts`、`AnyFileNode/node.ts` — override acceptsValue
- `src/main/nodePlugin/FolderNode/{node.ts,index.ts,render.vue}` — 新目录
- `src/renderer/src/App.vue` — nodes 过滤、拖出结算、postRestore

## 验证
1. `vue-tsc`/类型检查通过（尤其 render.vue 跨编译单元）
2. 手动：调色板加文件夹 → 拖文件进画布落在文件夹上 → 内部出现对应文件子节点；端口收文件 Value 也生成子节点
3. 先在某子节点上连边，再拖进文件夹 → 边仍显示可用
4. 移动文件夹 → 子节点整体平移、边跟随
5. 拖子节点出文件夹边界 → 释放回画布、边保留
6. 拉文件夹边角 < 2×2 槽位 → 被钳制
7. 删除文件夹 → 子节点释放回画布、边保留
8. 刷新重载 → 文件夹成员与尺寸从 DB 恢复