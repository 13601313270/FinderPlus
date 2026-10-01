# 图片裁剪节点 实现计划

## 仓库调研结论

### 架构对齐点
- **同构参考**：ImageCompressNode 是 ImgFileValue → ImgFileValue 链的标准模板——ImageCropNode 完全复用它的架构
- **节点双触发路径**：ImageCompressNode 同时支持「拖入节点一次性处理」和「端口输入响应式处理」——ImageCropNode 照搬
- **拖入机制**：`isPositionAcceptNodeDrop` + `onNodeDrop(source, startPos)` + `pendingSourceId` + `clearPending()` 这套模式
- **用户确认**：不需要 ImgFileNode 右键菜单入口——ImageCropNode 本身就支持拖入图片节点，足够

### 裁剪交互设计
render.vue 内嵌裁剪交互：
- 加载源图 → `<img>` → canvas 绘制原图
- canvas 上叠加裁剪框矩形（绝对定位 div + 四个角落 resize handle）
- 用户拖选裁剪区域 → 点「确认裁剪」→ canvas.drawImage 裁剪 → toDataURL → base64 → node.setOutput()
- 裁剪框坐标存**原图像素坐标**（saveState 持久化）

### 输出
- setOutput commit imageOutput → 下游刷新
- 底部按钮「生成图片文件节点」→ 照搬 ImageCompressNode 的 handleCreateImgNode

## 文件和模块

### 新建文件

| 文件 | 说明 |
|---|---|
| `src/main/nodePlugin/ImageCropNode/node.ts` | ImageCropNode 引擎节点类 |
| `src/main/nodePlugin/ImageCropNode/render.vue` | 裁剪 UI |
| `src/main/nodePlugin/ImageCropNode/index.ts` | manifest 导出 |

### 修改文件

| 文件 | 改动 |
|---|---|
| `src/main/nodePlugin/index.ts` | import ImageCropNode manifest，加进 functionalManifests |

## 实现步骤

### Step 1：ImageCropNode/node.ts

完全复用 ImageCompressNode 架构：
- TYPE = 'image-crop'
- 端口：`imageInput(ImgFileValue)` + `imageOutput(ImgFileValue)`
- 裁剪区域持久化：存 `cropRect: { x, y, w, h } | null`（原图像素坐标）
- 拖入路径：isPositionAcceptNodeDrop / onNodeDrop / pendingSourceId / clearPending 全套照搬
- 响应式路径：inputPortReceiveValue 调 notifyChanged
- setOutput(base64, mime, fileName)：照搬同名方法
- saveState / readState：存 cropRect

### Step 2：ImageCropNode/render.vue

核心裁剪交互：
1. 加载源图（File → ObjectURL → `<img>`，img.naturalWidth/Height 拿到原图尺寸）
2. canvas 绘制原图，canvas.width = naturalWidth, canvas.height = naturalHeight
3. 叠加裁剪框 div（绝对定位，canvas 上），带四个角 resize handle（pointer 事件）
4. 裁剪框坐标 = 原图像素坐标；渲染时用 CSS scale 适配 canvas 展示尺寸（展示可能被缩小）
5. 拖选 / resize 裁剪框：更新 cropRect（始终存原图像素坐标）
6. 确认裁剪：`ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)` → toDataURL → base64 → node.setOutput
7. 去重：存 lastCroppedFingerprint + lastCropRect，没变就跳过

去重 + 输出按钮 + 生成 ImgFileNode 按钮，全部照搬 ImageCompressNode。

### Step 3：ImageCropNode/index.ts

manifest 导出，跟其他节点同模式。

### Step 4：注册进 nodePlugin/index.ts

import + 加进 functionalManifests 数组末尾。

## 依赖和注意事项

- **TYPE = 'image-crop'**：不是 FileNode 子类，不会误触发 resolveByExtension 文件分发
- **裁剪精度**：cropRect 始终存原图像素坐标；CSS 展示可能缩小 canvas，拖拽时用 `e.offsetX / canvas.clientWidth * img.naturalWidth` 做换算
- **默认裁剪框**：首次进入（端口或拖入）cropRect = null → render.vue 画全图默认框，用户可直接点确认
- **MIME 保留**：输出 MIME 跟源图一致（png/webp 保留透明），文件名 `原名-cropped.原后缀`

## 验证

- [ ] ImageCropNode 从调色板创建，拖入 ImgFileNode → 自动预填全图裁剪框 → 调整 → 确认 → 下游刷新
- [ ] 左侧端口接 ImgFileNode，换源图 → 刷新源图 + 重置裁剪框为全图
- [ ] 持久化：刷新后裁剪框位置恢复
- [ ] PNG 透明通道裁剪后保留

## 风险和兜底

- **canvas 跨域**：本地文件（Electron）不触发跨域 → 安全
- **坐标换算**：严格区分 canvas.width（像素）vs canvas.clientWidth（CSS 尺寸），用归一化比例换算
- **render.vue 体积预估 300-400 行**，如果臃肿可抽 CropOverlay.vue 子组件
