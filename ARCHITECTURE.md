# CanvasDesk 系统框架

CanvasDesk 是一个基于 **Electron + Vue 3 + Three.js(AI)** 的节点式 / 画板式桌面应用框架。本文档讲解当前**已落地**的运行结构，不包含未实现的设想。

> 标注说明：`✅ 已实现` / `⚠️ 待做` 区分现状与后续方向，避免读者把计划当事实。

## 1. 顶层视角

应用分两个进程，各自持有同一份**引擎**：

- **引擎（`src/main/engine/`）**：纯粹的图计算逻辑，**零 electron 依赖**（已用搜索核对过 `engine` 下无 `import from 'electron'`）。这是它能被渲染进程直接 `import`、并共享同一实例的前提。
- **渲染进程**：负责 UI。测试画布 `App.vue` 建图并把节点渲染出来，`components/EdgeLayer.vue` 把节点之间的连线画出来。
- **主进程**：当前只有窗口创建与 `ping` IPC，尚未注册引擎（⚠️ 后续再桥接主进程侧 Scene）。

引擎因为不碰 electron，所以可以被 **main 和 renderer 两个 tsconfig 同时覆盖、并在 renderer 的 Vite 构建中打进同一个 bundle**。

## 2. 模块分层

```
src/
├─ main/
│  ├─ engine/                    # 引擎（纯逻辑）
│  │  ├─ node/Node.ts            # 节点抽象基类
│  │  ├─ port/InputPort.ts       # 输入端口
│  │  ├─ port/OutputPort.ts      # 输出端口
│  │  ├─ data/Value.ts           # 值基类（含各 value 子类）
│  │  ├─ graph/Scene.ts          # 场景：顶层容器与注册表
│  │  ├─ graph/SceneRegistry.ts  # workspaceScene 单例（进程内共享）
│  │  ├─ graph/Edge.ts           # 边：remember 一端 start 一端 end
│  │  └─ graph/EdgeBinder.ts     # 连线的唯一写入方
│  └─ nodePlugin/                # 节点插件目录
     │     ├─ manifest.ts            # NodePluginManifest 类型（node↔render 配对契约）
     │     ├─ index.ts               # 注册表：按节点 type 汇总各插件 manifest
     │     ├─ vue-shim.d.ts          # 让主进程 tsc 能解析 *.vue 导入
     │     ├─ TextInputNode/         # 一个节点 = 一个目录
     │     │  ├─ index.ts            # 该插件的 manifest（声明 nodeClass 与 render）
     │     │  ├─ node.ts             # 引擎逻辑（继承 Node）
     │     │  └─ render.vue          # 该节点的渲染组件
     │     └─ TextDisplayNode/
     │        ├─ index.ts
     │        ├─ node.ts
     │        └─ render.vue
└─ renderer/src/
   ├─ App.vue                    # 测试画布：建图 + 渲染 + 无限画布视口交互
   ├─ components/EdgeLayer.vue   # 连线层：每条 Edge 画一根线 + 线中央的删除按钮
   ├─ components/NodeShell.vue   # 节点外壳：世界定位 + 内容组件 + 两侧端口（所有节点通用）
   ├─ components/NodePorts.vue   # 端口圆点：左侧 InputPort / 右侧 OutputPort，有几个画几个
   ├─ canvas/viewport.ts         # 视口单例：平移偏移 + 缩放，屏幕↔世界坐标换算
   ├─ canvas/elements.ts         # 卡片 / 端口元素登记 + 世界坐标测量（连线的端点从这来）
   ├─ canvas/edges.ts            # 连线的纯几何：一条 Edge -> 世界坐标的起点/终点/中点
   ├─ composables/useNodePosition.ts  # 节点定位 + 拖拽（含视口缩放补偿），纯 UI 逻辑
   └─ assets/styles/variables.less
```

## 3. 引擎职责分层（谁做什么）

| 类 | 职责 | 关键约束 |
|----|------|---------|
| `Node` | 节点的抽象基类：`type` 标识、端口登记、观察者机制 | 不含 `run` 统一入口，各节点自己定节奏 |
| `InputPort` | 接收上游值；多值按无序集合 | `accepts` 必填，空数组 = 不接受任何类型 |
| `OutputPort` | 产出值并沿边派发；按指纹比对是否真变了 | `commit` 只在变了时才 notify |
| `Value` | 值类型基类，提供 `fingerprint` | 子类如 `StringValue` |
| `Edge` | 一条连线的端点记录 | 构造时两端就给定，别处不许自己 `new` |
| `EdgeBinder` | 连线的**唯一写入方** | `connect`/`disconnect` 一次性写两端指针，保证引用一致 |
| `Scene` | 顶层容器：按 id 的节点注册表 + 边集合 | 把连线委托给内部 `EdgeBinder`，`removeNode` 前先断边；节点/连线增删用 `onChanged` 对外广播 |
| `workspaceScene` | 进程内共享的单个 `Scene` 实例 | 建图方与 render.vue 握住同一实例 |

**关键约定**：
- 边的绑定 / 解绑必须走 `EdgeBinder.connect / disconnect`，别处不直接改端口的内外集合。
- `Scene.getNode(id: string)` 是 O(1) 查找；`addNode` 对重复 id 抛错。
- **成环检测 ⚠️ 尚未实现**：注释里明确这一点由「上层在调用 connect 前自行判断」，当前代码没做。

## 4. 插件目录约定

每个节点 = `nodePlugin/<节点名>/` 一个目录，内含：

- `node.ts`：引擎逻辑。定义节点类（`extends Node`），声明端口，实现 `onInputChanged`。
- `render.vue`：该节点的渲染组件，**只画卡片内容**（`defineProps<{ id: string }>()`，`id` 指明它控制
  场景里的哪个节点）。定位、两侧端口这类所有节点通用的东西不在这里：由 App.vue 用 `NodeShell`
  包一层统一负责，所以 render.vue 不再自己 `position: absolute`，也不再放 `<NodePorts>`。
- `index.ts`：该插件的 **manifest**，把上面的 nodeClass 和 render 钉死在同一份声明里：

```js
{
  type:      TextInputNode.TYPE,   // 单真相源，取节点类静态 TYPE（如 'text-input'）
  nodeClass: TextInputNode,
  render:    TextInputNodeRender
}
```

`nodePlugin/index.ts` 是注册表：把各插件的 manifest 汇总成 `type → manifest` 映射并导出
`getNodeManifest(type)` / `manifestFor(node)`。

**使用方（App.vue）只按 `node.type` 从注册表拿 manifest**，用 `new manifest.nodeClass(id)` 构造、
`<component :is="manifest.render">` 渲染——「节点类 ↔ 渲染组件」的配对只存在插件自己的 index.ts 一处，
从结构上杜绝把渲染组件绑错到别的节点类型。

render.vue 通过 `workspaceScene.getNode(id)` 拿**活引用**后直接读 / 改节点状态，**不走 IPC**——这正是「引擎纯逻辑」这一约束换来的收益。

## 5. Vue 响应式桥（重要）

引擎里的节点状态是可变的**普通类字段**，Vue 的响应式系统**追踪不到**。因此直接在模板里 `computed(() => node.text)` 不会自动刷新。

为此 `Node` 基类内置了一个观察者机制：

```ts
onChanged(fn: () => void): () => void   // 订阅，返回取消订阅函数
notifyChanged(): void                    // 子类在状态更新的收尾调用
```

以 `TextDisplayNode` 为例的规范做法：

1. `onInputChanged()` 刷新内部字段后调用 `this.notifyChanged()`；
2. `render.vue` 在 `onMounted` 里取到节点，调用 `node.onChanged(() => { text.value = node.text })` 写本地 ref，卸载时 `onUnmounted` 取消订阅。

input 节点是特例：它用 writable computed，`@input` 赋值会标记 dirty 触发 get 重算，所以不必走观察者也能自洽。

`Scene` 用的是同一套桥，只是广播的内容不同：`Scene.onChanged` 只报「图结构变了」（节点 / 连线的增删），
不报节点位置——位置变化归各节点的 `Node.onChanged` 管。UI 收到通知后自己去重读 `allEdges` / `allNodes`。

> 引擎侧因此有两级通知：**Scene 报结构，Node 报自身状态**。UI 要画连线，两级都得订（见第 7 节）。

## 6. 无限画布视口（平移 + 缩放）

画布是「无限」的：节点存的是**世界坐标**（`Node.position`），画布只是其中一个观察窗口，窗口的位置与倍率就是**视口状态**。

- `src/renderer/src/canvas/viewport.ts` 导出模块级 `reactive` 单例 `viewport = { x, y, scale }`，外加 `panViewport / zoomViewportAt / resetViewport` 三个写入函数。
- **坐标换算**：`屏幕 = 世界 × scale + (x, y)`。`zoomViewportAt` 以画布内某点为锚，缩放前后保持该点「底下」的世界坐标不动，故光标指哪朝哪缩。
- App.vue 把视口折成一条 CSS `transform: translate(x,y) scale(s)` 套在**世界层**（`.stage__world`）上；节点渲染组件仍按世界坐标 `left/top` 绝对定位落进世界层内，统一被缩放平移。
- 交互：拖拽空白处平移、普通滚轮平移、`Ctrl/Cmd + 滚轮`（或触控板捏合）缩放、顶栏按钮缩放/复位。
- **节点拖拽的 scale 补偿**：`useNodePosition` 拖拽拿到的指针位移是屏幕像素，落点要写回世界坐标，故除以当前 `scale`。它是纯 UI 逻辑，已放在 renderer 侧（`composables/useNodePosition.ts`），内部直接读 `viewport.scale`，不再由 render.vue 传入，也避免 main 侧的 `nodePlugin` 反向依赖 renderer。

> 视口是**渲染进程的 UI 状态**，不写进引擎：引擎只存节点世界坐标，怎么平移缩放是视图层的事。

## 7. 端口与连线渲染（Port → 画布）

### 7.1 节点外壳 + 端口圆点

App.vue 渲染节点时不是直接 `<component :is="manifest.render">`，而是用 `NodeShell` 包一层：

```
<NodeShell v-for="node in nodes" :node="node" :render="manifestFor(node)?.render" />
```

`components/NodeShell.vue` 是所有节点共用的「容器层」：它负责**世界定位**（绝对定位到
`node.position`，订阅 `onChanged` 跟着拖拽走），里面再放内容组件（`render.vue`）和 `<NodePorts>`。
于是「定位 + 端口」这些通用件从每个 render.vue 里抽了出来，以后新增节点类型，render.vue 只写内容。

`components/NodePorts.vue` 把端口画成小圆圈：**左侧 InputPort、右侧 OutputPort，有几个画几个**。
数量、id、类型全部来自 `node.ts` 的端口声明，UI 不重复维护一份。

- 位置：绝对定位在外壳上，圆心压在外壳的侧边线上（外壳是定位元素，圆点是它的绝对定位子元素）。
  竖向按端口个数均分：n 个端口时第 i 个落在 `(i+1)/(n+1)` 的高度上——1 个端口正好居中，
  3 个就是 1/4、1/2、3/4。
- 用 fragment 作根（两个 v-for 直接产出圆点），**不要**给圆点套中间容器：圆点的 `offsetParent`
  必须是外壳本身，否则下面量出来的位置会偏。

### 7.2 连线是「端口到端口」

`components/EdgeLayer.vue` 把 `Scene` 里的每条 `Edge` 画成一根线，线的两端是**端口圆点的中心**：
从上游的 OutputPort 圆点，连到下游的 InputPort 圆点。一条边本来就是「某个端口 -> 某个端口」，
画到圆点上才一眼看得出是哪个端口出去的、进了哪个端口。线的正中央还放一个删除按钮，
点它调 `Scene.removeEdge(edge)` 解除连接（走唯一解绑入口，同时 InputPort 会通知下游刷新）。

连线层排在世界层内、节点之前，所以线压在卡片下面、又被圆点盖住线头；坐标全用世界坐标，
平移缩放跟着世界层走，和节点永远对齐。

### 7.3 端点怎么量出来

`canvas/edges.ts` 是**纯几何**（不碰 Vue、不碰 DOM 事件），`canvas/elements.ts` 负责**测量**：

- 外壳：`NodeShell` 用 `nodeElementRef(id)` 登记根元素，位置取 `Node.position`（左上角），
  宽高取 `offsetWidth / offsetHeight`（外壳尺寸 = 卡片尺寸）；
- 端口：`NodePorts` 用 `portElementRef(nodeId, side, port)` 登记圆点，位置按「相对外壳边框盒的
  偏移」量出来，再加上节点的世界坐标。

`offsetWidth / offsetHeight / offsetLeft / offsetTop` 都是**布局值**，不受世界层 transform 的缩放
影响，所以读出来直接用，不必再除以 `viewport.scale`（代价是 `offset*` 取整到像素，端点可能有
半像素以内的偏差——画在线头、又被 12px 的圆点盖住，看不见）。

**注册表的键是字符串，不是对象**：`端口 = ${节点id}:${侧}:${端口id}`。这不是洁癖，是实测踩出来的坑——
render.vue 里的节点引用常被 Vue 包了一层（`ref(node)` 会把普通对象深转换成 reactive 代理），
从代理上读到的端口和引擎里那条边持有的原始端口**不是同一个引用**，按对象身份查表会全部落空、
连线统统退回卡片边线。DisplayNode 的 render.vue 现在改用 `shallowRef` 直接握住原始节点（引擎对象
本来就有自己的 onChanged 通知，不需要 Vue 再代理它），注册表则一律用字符串地址说话，两边都不依赖对象身份。

### 7.4 什么时候重量

边集合、节点位置、卡片与圆点的尺寸都不是响应式数据，所以几何靠三个「变化计数」驱动：

| 计数 | 何时 +1 | 谁维护 |
|------|---------|--------|
| `sceneTick` | 连线 / 节点增删（`Scene.onChanged`） | EdgeLayer |
| `nodeTick` | 任一节点位置变化（`Node.onChanged`） | EdgeLayer 订阅全部节点 |
| `canvasLayoutVersion` | 外壳 / 圆点登记、注销，外壳尺寸变化（ResizeObserver） | `canvas/elements.ts` |

**两个渲染上的坑，都已处理**：

- SVG 视口给 1x1、靠 `overflow: visible` 把内容放出来——连线坐标是世界坐标，可以落在任意远处甚至负数，
  默认会被 SVG 自己的视口裁掉（真正限制可见范围的是画布容器的 `overflow: hidden`）；
- 删除按钮跟世界层一起被 `scale` 缩放，所以按钮自己乘 `1 / viewport.scale` 抵掉，屏幕上始终 22px，缩到 20% 也点得到。

## 8. 数据流链路（核心：输入影响展示）

```
用户输入 @input
  → text.setText(v)                       // nodePlugin/TextInputNode
  → textOutput.commit(StringValue)        // OutputPort，指纹变化才继续
  → edges.forEach → edge.transferData     // EdgeBinder 建好的边
  → endPort.receive(edge, value)          // InputPort，指纹变化才唤起 owner
  → onInputChanged()                      // TextDisplayNode 刷新 displayed
  → notifyChanged()                       // 通知观察者
  → render.vue 订阅回调 → 写 text ref      // 触发 Vue 重渲染
```

整条链的关键是 **OutputPort/InputPort 都按指纹比对**——上游没变，下游绝不会被打扰。

## 9. 当前已实现 vs 待做

**已实现**
- ✅ 图数据模型（Node / InputPort / OutputPort / Value / Edge / Scene）
- ✅ `EdgeBinder` 连线唯一写入方，`connect` 时补送上游已算的值
- ✅ `Scene` 顶层容器 + 按 id 的 O(1) 查找 + `removeNode` 先断边
- ✅ `nodePlugin/<节点>/index.ts(manifest) + node.ts + render.vue` 插件目录约定
- ✅ `nodePlugin/index.ts` 类型→渲染组件注册表，App.vue 按 node.type 取 manifest 渲染
- ✅ `workspaceScene` 单例 + render 进程直接持有
- ✅ Node 观察者机制，解决 Vue 响应式断链；`Scene.onChanged` 广播图结构变化
- ✅ 测试画布 `App.vue`：输入节点连线展示节点，验证 `输入 → 展示` 链路
- ✅ 无限画布视口：平移（拖拽空白 / 滚轮）+ 缩放（Ctrl/Cmd + 滚轮 / 顶栏按钮），节点拖拽按 scale 补偿
- ✅ 连线渲染 `EdgeLayer.vue`：**端口到端口**的连线（端点取端口圆点中心），线中央的 × 一键解除该 Edge
- ✅ 端口圆点 `NodePorts.vue`：左侧 InputPort、右侧 OutputPort，有几个画几个（数量取自 node.ts 声明）
- ✅ 节点外壳 `NodeShell.vue`：定位 + 内容 + 端口统一收口，render.vue 只画内容（新增节点类型不再重复通用件）

**待做 ⚠️**（不要当现状读）
- 成环检测（摘要：connect 前由上层判定，代码未实现）
- 从端口拖拽连线交互（摘要：端口圆点目前只是「显示 + 端点」，建边仍由 App.vue 在代码里 `connect`）
- 完整序列化 / 反序列化（`Value` 已有 `toJSON`，没有整图导出）
- 主进程侧 Scene 与 IPC 桥（如 `node:get`）

## 10. 构建与检查

```bash
npm run typecheck   # tsc(node) + vue-tsc(web) 双重检查引擎与 render.vue
npm run build       # electron-vite 三端打包
npm run dev         # 启动并测试输入 → 展示链路
```

`tsconfig.web.json` 当前额外覆盖了 `src/main/engine/**` 与 `src/main/nodePlugin/**`，并设为 `composite: false + noEmit: true`，目的是让 `vue-tsc` 能检查 render.vue 及其引擎导入，同时避免声明文件覆盖 `preload/index.d.ts`。