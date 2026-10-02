import { computed, ref } from 'vue'
import type { Component } from 'vue'
import { getNodeManifest, nodeManifests } from '../../../main/nodePlugin'
import { resolveNodeTitle } from '../../../main/nodePlugin/manifest'
import { translate } from '@renderer/i18n'
import { useLanguageSettings } from './useLanguageSettings'

/**
 * 帮助中心 topic：统一「全局介绍」和「节点帮助」两种来源。
 * UI 层不用再区分来源，只管 type 比对和 load 调用。
 */
export interface HelpTopic {
  /** 唯一标识，用于侧边栏激活态比对 */
  readonly type: string
  /** 侧边栏显示名称。节点项取插件 manifest 的多语言 title，介绍项取词条 */
  readonly label: string
  /** 异步加载帮助组件 */
  readonly load: () => Promise<{ default: Component }>
}

/** 侧边栏分组：每个分组有标题和一组 topic */
export interface HelpTopicGroup {
  readonly title: string
  readonly items: ReadonlyArray<HelpTopic>
}

/** 全局介绍 topic 的固定 type 与加载器 */
const INTRO_TOPIC_TYPE = '__intro__'
const loadIntro = (): Promise<{ default: Component }> =>
  import('@renderer/components/help/Introduction.vue')

/**
 * 节点帮助 topics：从注册表里过滤出有 help 的节点，映射成 HelpTopic。
 * label 这里填 type 只是占位（不参与查找），真正的显示名在 helpGroups 里按语言现算。
 */
const nodeTopics: HelpTopic[] = nodeManifests
  .filter((m) => m.help != null)
  .map((m) => ({
    type: m.type,
    label: m.type,
    load: m.help!
  }))

/** 按 type 查找用的静态表（label 只作展示、不参与查找，这里不必翻译） */
const lookupTopics: ReadonlyArray<HelpTopic> = [
  { type: INTRO_TOPIC_TYPE, label: '', load: loadIntro },
  ...nodeTopics
]

const { language } = useLanguageSettings()

/**
 * 分组列表，侧边栏按这个渲染：
 * - 第一组：全局介绍（无标题，单独一项）
 * - 第二组：节点类型介绍
 *
 * 侧栏文案要跟着界面语言走，所以做成 computed 现算：读一下 language.value 做依赖登记，
 * 语言一变就重算（和 App.vue 里 sceneTick 的路子一致）。
 */
export const helpGroups = computed<ReadonlyArray<HelpTopicGroup>>(() => {
  const locale = language.value // 读一下即完成依赖登记，语言一变整个列表重算
  return [
    {
      title: '',
      items: [{ type: INTRO_TOPIC_TYPE, label: translate('helpCenter.about'), load: loadIntro }]
    },
    {
      title: translate('helpCenter.groupNodes'),
      // 节点项的显示名按语言现算：取自插件 manifest.title，未配的语言由 resolveNodeTitle 兜底
      items: nodeTopics.map((topic) => {
        const manifest = getNodeManifest(topic.type)
        return manifest ? { ...topic, label: resolveNodeTitle(manifest, locale) } : topic
      })
    }
  ]
})

// —— module 级单例状态 ——
const visible = ref(false)
const loading = ref(false)
const currentComp = ref<Component | null>(null)
const currentType = ref<string>('')

/** 打开帮助中心（默认选中第一个 topic） */
function openCenter(): void {
  visible.value = true
  if (!currentComp.value && lookupTopics.length > 0) {
    void selectTopic(lookupTopics[0])
  }
}

function closeCenter(): void {
  visible.value = false
}

/**
 * 打开帮助中心并直接定位到某个节点（调色板瓦片角上的「?」走这里）。
 *
 * 必须先 await 加载完再置 visible：HelpCenter 里有个 watch(visible)，
 * 看到 currentComp 还是空就会抢着选中第一个 topic，顺序反了就被覆盖成默认的介绍页。
 */
async function openTopic(type: string): Promise<void> {
  await selectTopic(type)
  visible.value = true
}

/**
 * 选中某个 topic，异步加载它的帮助组件。
 * 可以显式传 HelpTopic，也可以传 type（字符串）按注册表查找。
 */
async function selectTopic(target: HelpTopic | string): Promise<void> {
  const topic = typeof target === 'string'
    ? lookupTopics.find((t) => t.type === target)
    : target
  if (!topic) return

  loading.value = true
  currentType.value = topic.type
  currentComp.value = null
  try {
    const mod = await topic.load()
    currentComp.value = mod.default
  } finally {
    loading.value = false
  }
}

export function useHelpCenter() {
  return {
    visible, loading, currentComp, currentType, helpGroups,
    openCenter, closeCenter, openTopic, selectTopic
  }
}