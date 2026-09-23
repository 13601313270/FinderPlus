# CanvasDesk 系统框架

CanvasDesk 是一个基于 **Electron + Vue 3 + Three.js(AI)** 的节点式 / 画板式桌面应用框架。本文档讲解当前**已落地**的运行结构，不包含未实现的设想。

> 标注说明：`✅ 已实现` / `⚠️ 待做` 区分现状与后续方向，避免读者把计划当事实。

## 1. 顶层视角

应用分两个进程，各自持有同一份**引擎**：

- **引擎（`src/main/engine/`）**：纯粹的图计算逻辑，**零 electron 依赖**（已用搜索核对过 `engine` 下无 `import from 'electron'`）。这是它能被渲染进程直接 `import`、并共享同一实例的前提。
- **渲染进程**：负责 UI。测试画布 `App.vue` 建图并把节点渲染出来。
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
   ├─ App.vue                    # 测试画布：建图 + 渲染
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
| `Scene` | 顶层容器：按 id 的节点注册表 + 边集合 | 把连线委托给内部 `EdgeBinder`，`removeNode` 前先断边 |
| `workspaceScene` | 进程内共享的单个 `Scene` 实例 | 建图方与 render.vue 握住同一实例 |

**关键约定**：
- 边的绑定 / 解绑必须走 `EdgeBinder.connect / disconnect`，别处不直接改端口的内外集合。
- `Scene.getNode(id: string)` 是 O(1) 查找；`addNode` 对重复 id 抛错。
- **成环检测 ⚠️ 尚未实现**：注释里明确这一点由「上层在调用 connect 前自行判断」，当前代码没做。

## 4. 插件目录约定

每个节点 = `nodePlugin/<节点名>/` 一个目录，内含：

- `node.ts`：引擎逻辑。定义节点类（`extends Node`），声明端口，实现 `onInputChanged`。
- `render.vue`：该节点的渲染组件。`defineProps<{ id: string }>()`，`id` 指明它控制场景里的哪个节点。
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

## 6. 数据流链路（核心：输入影响展示）

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

## 7. 当前已实现 vs 待做

**已实现**
- ✅ 图数据模型（Node / InputPort / OutputPort / Value / Edge / Scene）
- ✅ `EdgeBinder` 连线唯一写入方，`connect` 时补送上游已算的值
- ✅ `Scene` 顶层容器 + 按 id 的 O(1) 查找 + `removeNode` 先断边
- ✅ `nodePlugin/<节点>/index.ts(manifest) + node.ts + render.vue` 插件目录约定
- ✅ `nodePlugin/index.ts` 类型→渲染组件注册表，App.vue 按 node.type 取 manifest 渲染
- ✅ `workspaceScene` 单例 + render 进程直接持有
- ✅ Node 观察者机制，解决 Vue 响应式断链
- ✅ 测试画布 `App.vue`：输入节点连线展示节点，验证 `输入 → 展示` 链路

**待做 ⚠️**（不要当现状读）
- 成环检测（摘要：connect 前由上层判定，代码未实现）
- 完整序列化 / 反序列化（`Value` 已有 `toJSON`，没有整图导出）
- 主进程侧 Scene 与 IPC 桥（如 `node:get`）

## 8. 构建与检查

```bash
npm run typecheck   # tsc(node) + vue-tsc(web) 双重检查引擎与 render.vue
npm run build       # electron-vite 三端打包
npm run dev         # 启动并测试输入 → 展示链路
```

`tsconfig.web.json` 当前额外覆盖了 `src/main/engine/**` 与 `src/main/nodePlugin/**`，并设为 `composite: false + noEmit: true`，目的是让 `vue-tsc` 能检查 render.vue 及其引擎导入，同时避免声明文件覆盖 `preload/index.d.ts`。