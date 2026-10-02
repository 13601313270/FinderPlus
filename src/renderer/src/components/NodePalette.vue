<script setup lang="ts">import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { paletteManifests } from '../../../main/nodePlugin';
import { resolveNodeTitle } from '../../../main/nodePlugin/manifest';
import {
 CATEGORY_LABELS,
 DEFAULT_NODE_CATEGORY,
 NODE_CATEGORIES,
 type NodeCategory
} from '../../../main/nodePlugin/category';
import { resolveLocalizedText } from '../../../shared/language';
import { useLanguageSettings } from '@renderer/composables/useLanguageSettings';
import { useHelpCenter } from '@renderer/composables/useHelpCenter';
/**
 * 节点调色板：画布左上角的「＋」按钮。
 *
 * 交互流程：
 * 1. 鼠标悬浮按钮 → 下拉展开；顶部是搜索框，下面按分类分组列出所有可添加的节点类型；
 * 2. 点击（或高亮后回车）某一类型 → emit('select-type', type)，由父组件构造节点并进入「跟随鼠标」状态；
 * 3. 下拉在选择 / 鼠标离开后自动收起。
 *
 * 为什么加搜索和分组：节点类型是线性增长的，而窗口高度是固定的。
 * 之前 22 个节点平铺就已经超出窗口被截断，所以菜单必须限高可滚、可按类折叠、可按名检索，
 * 否则每加一个节点就离溢出更近一步。
 *
 * 设计成纯 UI 组件：不碰 Scene、不构造节点，只把「用户想加什么类型」告诉上层。
 */
const { t } = useI18n();
const { language } = useLanguageSettings();
const { openTopic } = useHelpCenter();
const emit = defineEmits<{
 (e: 'select-type', type: string): void;
}>();
const expanded = ref(false);
/** 搜索关键词 */
const query = ref('');
/** 搜索框是否聚焦：聚焦或已有输入时不再自动收起，见 scheduleClose */
const searchFocused = ref(false);
/** 键盘高亮的项下标（对应打平后的列表，-1 表示无高亮） */
const activeIndex = ref(-1);
const rootEl = ref<HTMLElement | null>(null);
const menuEl = ref<HTMLElement | null>(null);
let closeTimer: ReturnType<typeof setTimeout> | undefined;

function openMenu(): void {
 if (closeTimer) {
 clearTimeout(closeTimer);
 closeTimer = undefined;
 }
 expanded.value = true;
}

function closeMenu(): void {
 if (closeTimer) {
 clearTimeout(closeTimer);
 closeTimer = undefined;
 }
 expanded.value = false;
 query.value = '';
 searchFocused.value = false;
 activeIndex.value = -1;
}

function scheduleClose(): void {
 // 正在搜索时不自动收起：鼠标点进搜索框后往往会移开去点别处，
 // 一移开就收起会把输入打断。用户没碰搜索框时（只在按钮上悬停）行为不变。
 if (searchFocused.value || query.value !== '') return;
 if (closeTimer)
 clearTimeout(closeTimer);
 // 给用户留出从按钮滑向下拉的时间，别一离开按钮就收
 closeTimer = setTimeout(() => {
 expanded.value = false;
 closeTimer = undefined;
 }, 150);
}

function onSelectType(type: string): void {
 closeMenu();
 emit('select-type', type);
}

/**
 * 点瓦片角上的「?」：收起调色板，打开帮助中心并直接定位到这个节点。
 *
 * 复用帮助中心那个弹窗，不另起一个只读弹窗——节点说明文档已经在那了，
 * 用户看完还能顺着侧栏翻到相邻节点。
 */
function onHelp(type: string): void {
 closeMenu();
 void openTopic(type);
}

interface PaletteItem {
 type: string;
 label: string;
 iconPaths: readonly string[];
 category: NodeCategory;
 /** 该节点是否注册了 manifest.help；没注册就不渲染帮助入口 */
 hasHelp: boolean;
}
interface PaletteGroup {
 /** 分组标识，搜索模式下固定为 'search' */
 key: string;
 /** 分组标题；搜索模式下为空串，模板据此不渲染标题 */
 label: string;
 items: PaletteItem[];
}

// 下拉项文案取自各个插件 manifest 自己声明的多语言 title；
// 插件没配当前语言时由 resolveNodeTitle 兜底（en → zh → 已配的第一种 → type）。
// 这样新增/第三方插件不用改 Finder+ 的中央词条表就能带上自己的显示名。
// 图标同理：manifest.iconPaths 由插件自己声明，缺省时列表项只显示文字。
// 分类同理：manifest.category 缺省时归入「其他」，第三方老插件不会从菜单里消失。
const allItems = computed<PaletteItem[]>(() => paletteManifests.map((m) => ({
 type: m.type,
 label: resolveNodeTitle(m, language.value),
 iconPaths: m.iconPaths ?? [],
 category: m.category ?? DEFAULT_NODE_CATEGORY,
 hasHelp: m.help != null
})));

const keyword = computed(() => query.value.trim().toLowerCase());

/** 分类展示顺序固定按 NODE_CATEGORIES；空搜索时分组，有搜索时打平成单一结果列表 */
const groups = computed<PaletteGroup[]>(() => {
 const kw = keyword.value;
 if (kw) {
 // 同时匹配显示名和 type：中文界面下输入 image 也能筛出图像类节点
 const hits = allItems.value.filter(
 (i) => i.label.toLowerCase().includes(kw) || i.type.toLowerCase().includes(kw)
 );
 // 无命中时返回空数组，模板据此显示「无匹配」提示
 return hits.length ? [{ key: 'search', label: '', items: hits }] : [];
 }
 return NODE_CATEGORIES
 .map((category) => ({
 key: category as string,
 label: resolveLocalizedText(CATEGORY_LABELS[category], language.value, category),
 items: allItems.value.filter((i) => i.category === category)
 }))
 .filter((g) => g.items.length > 0); // 空组不渲染
});

/** 每行瓦片数，必须与 CSS 里 .palette__grid 的 grid-template-columns 一致 */
const GRID_COLUMNS = 4;

interface NavEntry {
 type: string;
 /** 所在分组下标，用来判断左右键能不能跨格 */
 groupIndex: number;
 /** 组内行列（0 起），上下键按行跳要靠它 */
 row: number;
 col: number;
}

/**
 * 导航序列：按展示顺序打平，并记下每项的组内行列。
 *
 * 分组只影响渲染顺序、不影响索引，所以四向键都在这一个序列上走，
 * 不用关心当前是分组态还是搜索结果态。
 */
const navEntries = computed<NavEntry[]>(() => {
 const list: NavEntry[] = [];
 groups.value.forEach((group, groupIndex) => {
 group.items.forEach((item, i) => {
 list.push({
 type: item.type,
 groupIndex,
 row: Math.floor(i / GRID_COLUMNS),
 col: i % GRID_COLUMNS
 });
 });
 });
 return list;
});

const indexByType = computed(() => {
 const map = new Map<string, number>();
 navEntries.value.forEach((entry, i) => map.set(entry.type, i));
 return map;
});

/** 取某个节点在导航序列里的下标，未命中返回 -1 */
function indexOf(type: string): number {
 return indexByType.value.get(type) ?? -1;
}

/** 鼠标划过的项同步成为键盘高亮项，两种高亮不会同时出现在两个项上 */
function setActive(type: string): void {
 activeIndex.value = indexOf(type);
}

function scrollActiveIntoView(): void {
 nextTick(() => {
 // 渲染顺序即导航序列顺序，所以直接按下标取 DOM 即可
 const els = menuEl.value?.querySelectorAll<HTMLElement>('.palette__item');
 els?.[activeIndex.value]?.scrollIntoView({ block: 'nearest' });
 });
}

/**
 * 四向键移动高亮项。
 *
 * 上下键不能简单 ±1：4 列网格里按「下」只会往右挪一格，和视觉对不上，
 * 所以按「同组跳一行、列不变」算；该行已经不存在时落到相邻分组的首/末项，
 * 避免出现按了没反应。左右键只在组内平移，不跨组。
 */
function moveActive(dx: number, dy: number): void {
 const entries = navEntries.value;
 const len = entries.length;
 if (len === 0) return;

 if (activeIndex.value < 0 || activeIndex.value >= len) {
 activeIndex.value = dx > 0 || dy > 0 ? 0 : len - 1;
 scrollActiveIntoView();
 return;
 }

 const entry = entries[activeIndex.value];

 if (dx !== 0) {
 const next = activeIndex.value + dx;
 if (next >= 0 && next < len && entries[next].groupIndex === entry.groupIndex) {
 activeIndex.value = next;
 scrollActiveIntoView();
 }
 return;
 }

 const group = groups.value[entry.groupIndex];
 const target = entry.row * GRID_COLUMNS + entry.col + dy * GRID_COLUMNS;
 const inGroup = group.items[target];
 if (inGroup) {
 activeIndex.value = indexOf(inGroup.type);
 } else {
 const neighbour = groups.value[entry.groupIndex + dy];
 const anchor = neighbour && (dy > 0 ? neighbour.items[0] : neighbour.items[neighbour.items.length - 1]);
 if (!anchor) return;
 activeIndex.value = indexOf(anchor.type);
 }
 scrollActiveIntoView();
}

function onSearchKeydown(e: KeyboardEvent): void {
 switch (e.key) {
 case 'ArrowDown':
 e.preventDefault();
 moveActive(0, 1);
 break;
 case 'ArrowUp':
 e.preventDefault();
 moveActive(0, -1);
 break;
 case 'ArrowRight':
 e.preventDefault();
 moveActive(1, 0);
 break;
 case 'ArrowLeft':
 e.preventDefault();
 moveActive(-1, 0);
 break;
 case 'Enter': {
 const type = navEntries.value[activeIndex.value]?.type;
 if (type) {
 e.preventDefault();
 onSelectType(type);
 }
 break;
 }
 case 'Escape':
 e.preventDefault();
 closeMenu();
 break;
 }
}

/** 点击组件外部关闭浮层 */
function onDocumentPointerDown(e: PointerEvent): void {
 const target = e.target as Node;
 if (rootEl.value?.contains(target)) return;
 closeMenu();
}

// 关键词一变，之前的下标就失效了（分组/结果数量都可能变）
watch(query, () => {
 activeIndex.value = -1;
});

watch(expanded, (isOpen) => {
 if (isOpen) {
 document.addEventListener('pointerdown', onDocumentPointerDown);
 } else {
 document.removeEventListener('pointerdown', onDocumentPointerDown);
 }
});

onBeforeUnmount(() => {
 document.removeEventListener('pointerdown', onDocumentPointerDown);
 if (closeTimer) clearTimeout(closeTimer);
});
</script>

<template>
  <div
    ref="rootEl"
    class="palette"
    :class="{ 'palette--open': expanded }"
    @mouseenter="openMenu"
    @mouseleave="scheduleClose"
  >
    <button
      class="palette__trigger"
      type="button"
      :title="t('palette.addNode')"
      aria-haspopup="listbox"
      :aria-expanded="expanded"
    >
      ＋
    </button>

    <transition name="palette-fade">
      <div v-if="expanded" ref="menuEl" class="palette__menu" @wheel.stop>
        <div class="palette__search">
          <svg
            class="palette__search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.6-3.6" />
          </svg>
          <input
            v-model="query"
            class="palette__search-input"
            type="text"
            :placeholder="t('palette.searchPlaceholder')"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
            @keydown="onSearchKeydown"
          />
        </div>

        <div class="palette__list" role="listbox">
          <div v-if="!groups.length" class="palette__empty">{{ t('palette.noResult') }}</div>
          <div v-for="group in groups" :key="group.key" class="groupItem">
            <div v-if="group.label" class="palette__group" role="presentation">
              <span>{{ group.label }}</span>
            </div>
            <div class="palette__grid" role="presentation">
              <div
                v-for="item in group.items"
                :key="item.type"
                class="palette__item"
                :class="{ 'palette__item--active': indexOf(item.type) === activeIndex }"
                :data-item-type="item.type"
                role="option"
                :aria-selected="indexOf(item.type) === activeIndex"
                :title="item.label"
                @click.stop="onSelectType(item.type)"
                @mouseenter="setActive(item.type)"
              >
                <svg
                  v-if="item.iconPaths.length"
                  class="palette__icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path v-for="(d, i) in item.iconPaths" :key="i" :d="d" />
                </svg>
                <span class="palette__label">{{ item.label }}</span>
                <button
                  v-if="item.hasHelp"
                  class="palette__help"
                  type="button"
                  :title="t('palette.nodeHelp')"
                  :aria-label="t('palette.nodeHelp')"
                  @click.stop="onHelp(item.type)"
                >
                  ?
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="less">
.palette {
  // 画布左上角浮层：屏幕层，不吃世界缩放，也不被节点/连线盖住
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 20;
  user-select: none;

  &__trigger {
    width: 34px;
    height: 34px;
    padding: 0;
    border: 1px solid #d5d9e0;
    border-radius: 8px;
    background: @color-surface;
    color: @color-text;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
      background: #eef1f5;
      border-color: @color-primary;
      color: @color-primary;
    }
  }

  // 限高 + 纵向 flex：搜索框固定在顶部，只有下面的列表滚动。
  // 这是节点类型增长时唯一不会溢出的结构，max-height 必须给，否则列表会顶出窗口。
  &__menu {
    position: absolute;
    top: 40px; // 紧贴 trigger 下方
    left: 0;
    display: flex;
    flex-direction: column;
    width: 530px;
    // 只按视口比例限高，不再叠加固定像素上限：
    // 菜单距顶 52px，70vh 在 173px 以上的窗口都塞得下，所以不会溢出；
    // 而多出来那一截像素上限只会让本来放得下的列表白白出现滚动条。
    max-height: 80vh;
    border: 1px solid #c0c6d0;
    border-radius: 8px;
    background: @color-surface;
    // 双层叠加：近层给「贴着画布」的接触感，远层给「浮在空中」的高度感。
    // 原来单层 `0 4px 16px / 0.12` 在浅灰画布和白色节点卡片上几乎看不见，
    // 面板和底下的节点糊成一片，分不出层级。
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.1),
      0 12px 40px rgba(0, 0, 0, 0.18);
    overflow: hidden; // 裁掉子元素直角，圆角才生效
  }

  &__search {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 1px solid #eef1f5;
    color: #8a919c;
  }

  &__search-icon {
    flex: 0 0 auto;
  }

  &__search-input {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    font-size: 13px;
    font-family: inherit;
    color: @color-text;
    // 外层 .palette 设了 user-select: none，这里必须放开，否则选不中输入框里的字
    user-select: text;

    &:focus {
      outline: none;
    }

    &::placeholder {
      color: #a8afb9;
    }
  }

  // min-height: 0 是 flex 子项能滚动的关键，缺了它列表会撑开容器而不是滚动
  &__list {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    padding: 8px;

    .groupItem {
      display: flex;
      align-items: start;

      // 组与组之间加一条淡淡的分割线，隔开相邻分类（首组不画）
      & + .groupItem {
        padding-top: 10px;
        border-top: 1px solid #eef1f5;
      }
    }
  }

  // 组内 4 列网格：高度不再随节点数线性增长，7 组 22 项只占 8 行左右。
  // 列数必须与脚本里的 GRID_COLUMNS 保持一致。
  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  // 滚动时把当前分类标题钉在顶部，省得滑几屏后不知道在看哪一组
  &__group {
    top: 0;
    width: 100px;
    height: 34px;
    flex-shrink: 0;
    z-index: 1;
    padding: 6px 12px 4px;
    background: @color-surface;
    font-size: 12px;
    line-height: 1.2;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #8a919c;
    text-transform: uppercase;
    display: flex;
    align-items: center;
  }

  // 图标在上、名字在下：4 列下每格约 70px，菜单不至于为了长名字被撑得太宽
  &__item {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 3px;
    padding: 6px 8px;
    min-width: 60px;
    height: 48px;
    border-radius: 6px;
    font-size: 12px;
    color: #1f2329;
    cursor: pointer;
    border: solid 1px #dedede;
    transition: background 0.1s ease, color 0.1s ease;

    // 键盘高亮与鼠标悬浮共用一套视觉，两者不会同时出现在两个项上
    &--active,
    &:hover {
      background: #eef1f5;
      color: @color-primary;

      .palette__icon {
        color: @color-primary;
      }
    }
  }

  // 节点帮助入口：平时透明，瓦片被悬停（或按钮被键盘聚焦）时才浮出来。
  // 22 个瓦片都常驻一个「?」会把 4 列网格搅得很花，而它只是个次要入口。
  //
  // 它必须有一套只属于自己的 hover 反馈。整张瓦片本来就可点，如果「?」悬浮只是
  // 跟着变个文字色（和瓦片悬浮同一套配色），用户分不清鼠标到底停在卡片上还是停在
  // 「?」上，也就不知道这颗「?」是不是一个独立按钮。
  // 所以静止态先给白底 + 描边，让它长得像个按钮；hover 时整颗填主色、文字翻白，
  // 明确地从瓦片上「浮」出来。
  &__help {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 17px;
    height: 17px;
    padding: 0;
    border: 1px solid #d5d9e0;
    border-radius: 50%;
    background: @color-surface;
    color: #8a919c;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
    transition: opacity 0.1s ease, background 0.1s ease, border-color 0.1s ease,
      color 0.1s ease;

    &:hover,
    &:focus-visible {
      border-color: @color-primary;
      background: @color-primary;
      color: #fff;
      outline: none;
    }
  }

  &__item:hover &__help,
  &__help:focus-visible {
    opacity: 1;
  }

  &__icon {
    flex: 0 0 auto;
    color: #8a919c;
    width: 20px;
    height: 20px;
    transition: color 0.1s ease;
  }

  // 长名字（英文 Background Remove、德文 Bildverarbeitung）截断显示，
  // 完整名字挂在瓦片的 title 上，悬停仍能看到
  &__label {
    max-width: 100%;
    line-height: 1.2;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__empty {
    padding: 10px 12px;
    font-size: 13px;
    color: #8a919c;
  }
}

.palette-fade-enter-active,
.palette-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.palette-fade-enter-from,
.palette-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>