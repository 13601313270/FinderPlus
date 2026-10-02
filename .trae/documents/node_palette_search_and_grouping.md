# 节点调色板：搜索 + 分类分组

## Context

画布左上角「＋」调色板（[NodePalette.vue](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/renderer/src/components/NodePalette.vue)）把所有功能节点平铺成一个线性下拉列表。节点类型涨到 22 个后，菜单高度 ≈ 22 × 33px + 8px ≈ 734px，加上距顶部 52px 的偏移，需要约 786px 的窗口高度才能完整显示——窗口一矮就被截断，且改动前的图标方案让每行更高，问题更明显。

根因不是"菜单太高"，而是**列表高度随节点数线性增长，既没有上限，也没有分级和检索**。

参考做法（n8n / ComfyUI）的共性是：**搜索框常驻顶部，分类只是没输入时的导航，面板有最大高度并可滚动，永不溢出窗口**。

本次目标：把调色板升级为「搜索 + 分类分组 + 限高滚动」，使节点继续增长也不再溢出。**保持 hover 展开的交互不变**。

已确认的决策：
- 范围：搜索 + 分类分组
- 展开方式：保持 hover 展开（见下方「hover 与搜索的冲突」）
- 不做：居中弹层面板（节点数到 50+ 再说）

---

## 1. 新增分类 taxonomy —— `src/main/nodePlugin/category.ts`（新文件）

分类是**跨插件共享的词汇表**：插件只声明 `category: 'image'` 这样的 id，标签文案集中放在这里。

```ts
export const NODE_CATEGORIES = ['input', 'text-data', 'image', 'ai', 'file', 'flow', 'other'] as const
export type NodeCategory = (typeof NODE_CATEGORIES)[number]
export const CATEGORY_LABELS: Record<NodeCategory, LocalizedText> = { /* 7 组 × 15 语言 */ }
```

- 数组顺序即菜单里的分组展示顺序；`'other'` 放最后，作为未声明分类的兜底桶。
- `LocalizedText` 取 `src/shared/language.ts`；兜底**复用已有的 `resolveLocalizedText()`**（[language.ts#L30-L37](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/shared/language.ts#L30-L37)），不要再写一份。
- 分类标签放这里而不是渲染进程的 `i18n/locales/*.ts`，与 `NodePluginManifest.title` 的既有做法一致——节点名不在中央词条表里，分类名同理。

**22 个节点的归属**：

| id | 中文 | 节点 |
|---|---|---|
| `input` | 输入 | text-input / number-input / bool-input / file-info |
| `text-data` | 文本与数据 | text-display / string-concat / json-display |
| `image` | 图像处理 | image-preview / image-compress / image-quality / image-crop / image-overlay / background-remove |
| `ai` | AI 能力 | llm / image-gen |
| `file` | 文件与目录 | folder / img-folder |
| `flow` | 流程与自动化 | switch / human-review / http-request / command / code |

（4 + 3 + 6 + 2 + 2 + 5 = 22 ✓）

## 2. manifest 加分类字段 —— `src/main/nodePlugin/manifest.ts`

在 `NodePluginManifest` 里，紧挨现有的 `iconPaths` 加一个可选字段：

```ts
/** 调色板分组（可选）。缺省时归入 'other'，保证第三方老插件不会因为没配分类而消失。 */
readonly category?: NodeCategory
```

选可选而非必填，是为了不破坏第三方 / 尚未适配的插件；类型上从 `category.ts` 导入 `NodeCategory`。

## 3. 22 个插件声明分类

每个 `src/main/nodePlugin/<Xxx>Node/index.ts` 在 `iconPaths` 那一行旁边加一行 `category: 'xxx',`——和上一轮加图标同一个位置、同一种改法。文件类节点（TxtFileNode / ImgFileNode / AnyFileNode）不在调色板里，本次不改。

## 4. 重构 `NodePalette.vue`

### 4.1 hover 与搜索的冲突（关键）

hover 展开 + 搜索框天然打架：用户点进搜索框打字时鼠标往往会移开菜单，`mouseleave` 一触发菜单就关了，输入被打断。

处理办法：**搜索框聚焦、或已有输入内容时，暂停自动收起**。

```ts
function scheduleClose(): void {
  // 正在搜索时不自动收起，否则鼠标一移开就把输入打断了
  if (searchFocused.value || query.value !== '') return
  /* 原有的 150ms 延迟收起逻辑 */
}
```

`openMenu()` 里的 `clearTimeout` 保持原样。搜索框拿到焦点后菜单即"钉住"，直到：点击画布空白处、按 Esc、或选中某个节点——都在已有的关闭路径里复用。

### 4.2 搜索框

菜单顶部一个 `<input>`，`placeholder` 取 `t('palette.searchPlaceholder')`；菜单展开时自动聚焦（`nextTick` + `ref.focus()`）。

过滤规则：对当前语言下的 `title` 和节点 `type` 同时做**大小写不敏感的 includes**。命中 `type` 是有意为之——中文界面下输入 `image` 也能筛出图像节点。

### 4.3 分组渲染

`items` computed 改造成按分类分组的结构：

```ts
// query 为空 → 分组结构；query 非空 → 打平成单一结果列表（分类标题不再显示）
const groups = computed(() => /* [{ category, label, items }]，按 NODE_CATEGORIES 顺序，空组不渲染 */)
```

- 分组标题用 `resolveLocalizedText(CATEGORY_LABELS[c], language.value, c)`，加 `position: sticky; top: 0`，滚动时始终知道自己在哪一组。
- 未声明 category 的节点落进 `other`；`other` 组为空时整组不渲染。
- 搜索无结果显示 `t('palette.noResult')`。

### 4.4 限高滚动（溢出止血）

```less
&__menu {
  max-height: min(70vh, 520px);
  overflow-y: auto;   // 注意：现在是 overflow: hidden，必须改掉，否则滚不动
}
```

### 4.5 键盘导航与点击外部关闭

照搬 [SelectMenu.vue#L102-L163](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/renderer/src/components/SelectMenu.vue#L102-L163) 已经验证过的模式，不重新发明：

- `activeIndex` + `moveActive(step)`，高亮项 `scrollIntoView({ block: 'nearest' })`
- `ArrowUp` / `ArrowDown` 移动、`Enter` 选中、`Escape` 关闭
- `document.addEventListener('pointerdown')` 判断点击是否在组件外（NodePalette 目前没有这层，需要新增）；在 `watch(expanded)` 里挂/卸监听，`onBeforeUnmount` 兜底

分组模式下高亮项需要用**扁平下标**映射回具体节点（分组只影响渲染，`activeIndex` 始终对应打平后的列表）。

无障碍：菜单 `role="listbox"`，每项 `role="option"` + `aria-selected`，触发器 `aria-expanded` / `aria-haspopup`。

## 5. i18n 词条

- [types.ts#L47-L49](file:///Users/wanghaoran/Desktop/code/CanvasDesk/src/renderer/src/i18n/types.ts#L47-L49) 的 `palette` 增加 `searchPlaceholder` 和 `noResult` 两个 `string` 字段
- 15 个 `src/renderer/src/i18n/locales/*.ts` 各补这两条（zh / en / ja / ko / es / ar / fr / pt / ru / hi / id / de / vi / tr / it）
- 类型是强制齐全的，漏一个语言会编译报错

---

## 执行顺序

1. `category.ts`（taxonomy + 15 语言标签）
2. `manifest.ts` 加 `category` 字段
3. 22 个插件 `index.ts` 各加一行 `category`
4. `i18n/types.ts` + 15 个 locale 文件补两条词条
5. `NodePalette.vue` 重构（搜索 / 分组 / 限高 / 键盘 / 点击外部 / hover 冲突处理）

第 3、4 步是纯机械重复的批量改动，可交给子代理并行处理，完成后我会 grep 校验数量并复核。

## 验证

先 `npm run typecheck`（含 `typecheck:node` + `typecheck:web`），再 `npm run dev` 手动过一遍：

| # | 检查项 | 期望 |
|---|---|---|
| a | 窗口高度拉到 ~500px 后展开菜单 | 出现滚动条，最后一项可达，不再溢出窗口 |
| b | 搜索框输入「图片」 | 只剩图像处理相关节点，分类标题隐藏 |
| c | 搜索框输入 `image` | 也能命中（按 type 匹配），中文界面下同样有效 |
| d | 清空搜索 | 恢复分组，顺序为 输入 → 文本与数据 → 图像处理 → AI → 文件与目录 → 流程与自动化 |
| e | 点进搜索框打字，再把鼠标移到画布上 | 菜单**不**自动关闭，输入不被打断 |
| f | 鼠标只悬停、不点搜索框，然后移开 | 仍在 150ms 后自动收起（原有行为不回退） |
| g | 上下键 + Enter | 高亮项随滚动进入可视区，回车能把节点加到画布 |
| h | Esc / 点击画布空白处 | 菜单关闭 |
| i | 切换界面语言 | 分类标题与搜索占位符跟着变 |
| j | 新增一个不配 `category` 的插件 | 落入「其他」组，不会从菜单消失 |