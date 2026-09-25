# 拖入文件命中已有节点 → 节点可劫持文件

## Context（为什么改）

外部文件拖入画布时，现在一律走 `App.vue::onCanvasDrop` 的「按后缀新建 FileNode」链路：`copyPath` 复制 → `new nodeClass` → `setFile` → `addNode`。

每个 `Node` 现在有了 `position` + `box`（内容区宽高）。新增能力：drop 时**先用落点做命中测试**，凡落点落在某个已有节点内容区内的节点，调用它新加的抽象方法；该方法返回 `true` 表示该节点**劫持**这个文件（跳过新建节点逻辑）；只有当命中的节点全部返回 `false`（或没命中任何节点）才走现有「拖成新节点」逻辑。

已与用户确认的口径：
1. **契约（镜像现有链路）**：方法接收**已复制到画布目录后的 `fileName` + `size`**（与 `FileNode.setFile(fileName, size)` 对齐）。文件复制由渲染进程经 `fileApi.copyPath` 先完成，节点拿到结果——引擎层保持纯逻辑，不碰 `window`/`fileApi`/Electron。
2. **命中范围 = 仅内容区 box**（不含端口列）。坐标判定：`node.position ≤ 点 < position + box`。`box` 某维为 0（该轴不约束）时**该节点不参与命中**（无法确定边界，直接跳过）。
3. 方法为 **abstract**（沿用「强制子类显式声明」惯例），返回值 `boolean`。渲染进程用 `await` 调用（同步方法也兼容）。

## 实施步骤

### 1. `Node.ts` 新增抽象方法
在 `src/main/engine/node/Node.ts`（`beforeDestroy`/`contextMenuItems` 附近）加：
```ts
/**
 * 外部文件拖入画布、落点命中本节点内容区时被调用（渲染进程在 drop 时触达）。
 * @param fileName 已复制到画布目录后的文件名（可能带 _1 去重后缀）
 * @param size     文件字节数
 * @returns true = 本节点劫持该文件（渲染进程不再新建节点）；false = 不处理
 * 引擎层只拿结果：文件复制由渲染进程经 IPC copyPath 完成。
 */
abstract acceptFileDrop(fileName: string, size: number): boolean
```

### 2. 各子类实现返回 false（机制就位、行为不变）
- **直接 `extends Node`，必须实现**（加 `acceptFileDrop(): false` 即可）：
  - `TextInputNode/node.ts`、`NumberInputNode/node.ts`、`TextDisplayNode/node.ts`、`ImagePreviewNode/node.ts`、`FileInfoNode/node.ts`
- **`FileNode`（abstract 基类）给一个默认 `return false`**，其子类 `TxtFileNode` / `ImgFileNode` / `AnyFileNode` 自动继承，不必逐个写：
  ```ts
  acceptFileDrop(fileName: string, size: number): boolean {
    return false // 子类需要接收拖入文件时 override 即可
  }
  ```
> 本轮**不启用**任何节点的真实劫持（全部 false），只把拦截机制和 fallback 接通，风险为零。以后某节点想接文件，override 返回接收逻辑即可，无需改 App.vue。

### 3. `App.vue::onCanvasDrop` 插入命中测试 + fallback
在现有链路里，拿到 `manifest` 后、`new nodeClass` 之前，插入命中测试并复用已复制的 `copied`：

```ts
const ext = extractExtension(file.name)
const manifest = resolveByExtension(ext)

// 命中测试：落点是否落在既有节点内容区内，且该节点愿意劫持
let hijacked = false
for (const n of workspaceScene.allNodes) {
  const [bw, bh] = n.box
  if (bw <= 0 || bh <= 0) continue           // 轴不约束的节点跳过
  const [px, py] = n.position
  const inside = wx >= px && wx <= px + bw && wy >= py && wy <= py + bh
  if (!inside) continue
  if (n.acceptFileDrop(copied.fileName, copied.size)) { hijacked = true; break }
}
if (hijacked) continue                        // 该节点劫持了文件，结束这个文件

// —— 未被劫持：走原新建节点逻辑（复用 copied 避免二次 copyPath）——
const node = new manifest.nodeClass(generateNodeId(manifest.type))
node.setPosition(wx, wy)
;(node as FileNode).setFile(copied.fileName, copied.size)
workspaceScene.addNode(node)
```

需要把现有「先 copy 再 new」的顺序保持：当前代码是先 `new` → `copyPath` → `setFile`；改为先 `copyPath` 取到 `copied`，再命中测试，**复用 `copied`** 走新建（避免复制两次）。`break`（只处理第一个文件）保持。

> 边界：`FileInfoNode` 等纯展示/非文件节点作 drop 目标时，其 `acceptFileDrop` 默认 false，不影响。未命中任何节点 → 命中原样新建，行为与现在完全一致。

## 关键文件
- `src/main/engine/node/Node.ts`（抽象方法）
- `src/main/nodePlugin/FileNode/node.ts`（默认 false）
- `src/main/nodePlugin/{TextInputNode,NumberInputNode,TextDisplayNode,ImagePreviewNode,FileInfoNode}/node.ts`（各实现 false）
- `src/renderer/src/App.vue` `onCanvasDrop`（命中注入）

## 验证
- `npm run typecheck`（含 vue-tsc）——abstract 漏实现会在 node 侧报错。
- `npm run dev` 手动验证：
  - 拖文件到**空白画布** → 仍按后缀新建节点（回归锚点）。
  - 拖文件到一个已有节点上 → 因全部节点返回 false，仍新建节点（当前无行为差异）。
  - 临时把某个节点的 `acceptFileDrop` 改 `return true`，拖到它身上 → 不再新建节点、该节点接手文件（快速验证机制生效，验证后改回）。