# 图片质量调整节点（image-quality）实施方案

## 背景

需求：新增一个「图片质量调整」节点，底层用 npm wasm 包 `img-compressor-wasm`（Rust → WASM，按
`quality(1–100)` + `format(jpeg/png)` 压缩，纯前端本地执行）。

现状与约束：
- 已有「图片压缩」节点 [ImageCompressNode](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/main/nodePlugin/ImageCompressNode/node.ts)：按最长边缩放 + 画质固定 0.85，用 `canvas.toDataURL` 编码。**本次不改动它**，新节点独立并存。
- 已确认包可用：`img-compressor-wasm@0.1.1`，导出 `init()` 与 `compress_image(Uint8Array, quality, 'jpeg'|'png')`；**失败返回空数组、不抛异常**（每次必须判空）。
- **关键风险**：包内 wasm 胶水代码用 `fetch(new URL('image_compressor_bg.wasm', import.meta.url))` 加载二进制。开发环境 Vite dev server 走 `http://localhost` 正常；但生产环境 renderer 由 [src/main/index.ts](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/main/index.ts#L88-L92) 的 `loadFile()` 加载（`file://`），Chromium 会拒绝 `file://` 的 fetch。→ 需要主进程 IPC 读字节的兜底。

## 复用的现有模式

- 节点插件三件套 `node.ts` + `render.vue` + `index.ts`(manifest)，注册进 [nodePlugin/index.ts](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/main/nodePlugin/index.ts) 的 `functionalManifests`。
- 触发/去重架构照抄 ImageCompressNode：拖入一次性（`pendingSourceId`）+ 端口响应式；`fingerprint/参数` 去重；引擎侧「收信号 + 提交结果」，render.vue 干活。
- 工具：[base64.ts](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/main/engine/data/base64.ts)（`base64ToBytes`/`bytesToBase64`）、[hash.ts](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/main/engine/data/hash.ts)（`djb2`）、[useNodePosition.ts](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/renderer/src/composables/useNodePosition.ts)。
- 「生成图片文件节点」逻辑照抄 ImageCompressNode 的 `handleCreateImgNode`（走 `window.fileApi.writeBuffer`）。

## 改动清单

### 1. 安装依赖
`npm install img-compressor-wasm`（进 `dependencies`）。

### 2. 新增 `src/main/nodePlugin/ImageQualityNode/node.ts`
`class ImageQualityNode extends Node`，`TYPE = 'image-quality'`：
- 端口：`imageInput`(source, ImgFileValue) / `imageOutput`(image, ImgFileValue, '调整后')
- 状态：`quality`（默认 80）、`format`（`'jpeg' | 'png'`，默认 jpeg）、`pendingSourceId`、`lastProcessedFingerprint/Quality/Format`
- API：`compressSource`（拖入优先于端口）、`pendingSource`、`quality`/`exportFormat` getter、`setQuality(n)`（clamp 1–100 并 `Math.round`，变更则 notifyChanged）、`setFormat(f)`、`markProcessed(fp,q,f)`、`clearPending()`、`setOutput(base64,mime,fileName)`、`inputPortReceiveValue → notifyChanged`、`isPositionAcceptNodeDrop/onNodeDrop`（照抄）
- 持久化：`saveState()` 只存 `{ quality, format }`；`readState()` 只恢复这两项（压缩结果不持久化）
- `this.setBox(260, 300)`

### 3. 新增 `src/main/nodePlugin/ImageQualityNode/render.vue`
卡片布局：头部（标题 + jpeg/png 下拉）/ 预览区 / 质量滑杆（`<input type="range" min=1 max=100>` + 实时数值）/ 底部（`原大小 → 压缩后` + 压缩比 + 「生成图片文件节点」按钮）。
- 滑杆交互：`@input` 只更新本地数值显示（跟手）；`@change`（松手）才 `node.setQuality()` 触发重压——wasm 是**同步阻塞**计算，避免拖动过程中反复压缩卡顿。
- `runCompress`：懒加载 wasm 模块（模块级 promise 缓存）→ 初始化 → `new Uint8Array(await file.arrayBuffer())` → `compress_image(bytes, q, format)` → **判空**（`length === 0` 视为失败，显示错误提示、不提交）→ 组 `File`（`${baseName}-q${q}.jpeg|png`）→ `n.setOutput(...)`；记录 `originalSize`/`compressedSize` 计算压缩比。
- 触发与去重：照抄 ImageCompressNode 的 `handleCompress`（`fp`/`quality`/`format` 变化或拖入 pending 才压）。
- 卸载时 revoke objectURL。

### 4. wasm 加载兜底（生产 file:// 安全）
- [src/main/index.ts](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/main/index.ts)：新增 IPC `wasm:readImageCompressor` → 用 `app.getAppPath()` 拼 `node_modules/img-compressor-wasm/rust-wasm/pkg/image_compressor_bg.wasm`，`readFileSync` 后返回 base64（Electron 的 `fs` 可直接读 asar 内路径）。
- [src/preload/index.ts](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/preload/index.ts)：新增 `wasmApi.readCompressor(): Promise<string>` 并 `exposeInMainWorld('wasmApi', ...)`；同步更新 [src/preload/index.d.ts](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/preload/index.d.ts) 的 `Window` 声明。
- render.vue 初始化策略：`await import('img-compressor-wasm')` 后先 `await init()`；失败则 `init(base64ToBytes(await window.wasmApi.readCompressor()))`。

### 5. 注册
[nodePlugin/index.ts](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/main/nodePlugin/index.ts)：import 新 manifest 并加入 `functionalManifests`（`paletteManifests` 自动带出，＋菜单显示 `image-quality`，与现有节点显示原始 type 的约定一致）。

## 不做
- 不改动现有 ImageCompressNode / BackgroundRemoveNode
- 新节点只做「质量 + 格式」，不做缩放（缩放仍归现有「图片压缩」节点）
- 不新增 help 文档（保持最小改动；后续需要再补）

## 验证
1. `npm run typecheck`（`typecheck:web` 覆盖 `src/main/nodePlugin/**/*.vue`）。
2. `npm run dev` 手工验证：
   - ＋菜单出现 `image-quality`，可拖入画布
   - 拖入图片节点 → 出压缩结果；拖动质量滑杆松手 → 重压，体积/压缩比刷新；滑杆拖动过程不卡顿
   - 切 jpeg/png → 重压；左侧端口接图片节点 → 上游换图自动重压
   - 「生成图片文件节点」→ 画布目录出现压缩文件
   - 损坏/非图片输入 → 显示失败提示、不崩溃
3. 生产兜底：`npm run build` 后 `npm run start`（或 `build:mac`），确认 `file://` 下仍能压缩（验证走 IPC 字节路径）。
