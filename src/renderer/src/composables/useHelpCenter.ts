import { ref } from 'vue'
import type { Component } from 'vue'
import { nodeManifests } from '../../../main/nodePlugin'

/**
 * 帮助中心 topic：统一「全局介绍」和「节点帮助」两种来源。
 * UI 层不用再区分来源，只管 type 比对和 load 调用。
 */
export interface HelpTopic {
  /** 唯一标识，用于侧边栏激活态比对 */
  readonly type: string
  /** 侧边栏显示名称 */
  readonly label: string
  /** 异步加载帮助组件 */
  readonly load: () => Promise<{ default: Component }>
}

/** 侧边栏分组：每个分组有标题和一组 topic */
export interface HelpTopicGroup {
  readonly title: string
  readonly items: ReadonlyArray<HelpTopic>
}

/** 全局介绍 topic，固定放在第一组（单独一组，无标题） */
const introTopic: HelpTopic = {
  type: '__intro__',
  label: '关于 Finder+',
  load: () => import('@renderer/components/help/Introduction.vue')
}

/** 节点帮助 topics：从注册表里过滤出有 help 的节点，映射成 HelpTopic */
const nodeTopics: HelpTopic[] = nodeManifests
  .filter((m) => m.help != null)
  .map((m) => ({
    type: m.type,
    label: m.type,
    load: m.help!
  }))

/**
 * 分组列表，侧边栏按这个渲染：
 * - 第一组：全局介绍（无标题，单独一项）
 * - 第二组：节点类型介绍
 *
 * 编译期确定，不需要响应式。
 */
export const helpGroups: ReadonlyArray<HelpTopicGroup> = [
  { title: '', items: [introTopic] },
  { title: '节点类型介绍', items: nodeTopics }
]

/** 扁平化的所有 topic，内部查找用（selectTopic 按 type 匹配） */
const allTopics: ReadonlyArray<HelpTopic> = helpGroups.flatMap((g) => g.items)

// —— module 级单例状态 ——
const visible = ref(false)
const loading = ref(false)
const currentComp = ref<Component | null>(null)
const currentType = ref<string>('')

/** 打开帮助中心（默认选中第一个 topic） */
function openCenter(): void {
  visible.value = true
  if (!currentComp.value && allTopics.length > 0) {
    void selectTopic(allTopics[0])
  }
}

function closeCenter(): void {
  visible.value = false
}

/**
 * 选中某个 topic，异步加载它的帮助组件。
 * 可以显式传 HelpTopic，也可以传 type（字符串）按注册表查找。
 */
async function selectTopic(target: HelpTopic | string): Promise<void> {
  const topic = typeof target === 'string'
    ? allTopics.find((t) => t.type === target)
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
  return { visible, loading, currentComp, currentType, helpGroups, openCenter, closeCenter, selectTopic }
}
