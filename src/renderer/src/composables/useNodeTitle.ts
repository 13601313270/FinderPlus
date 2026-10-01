import { computed, type ComputedRef } from 'vue'
import type { Node } from '../../../main/engine/node/Node'
import { getNodeManifest } from '../../../main/nodePlugin'
import { resolveNodeTitle } from '../../../main/nodePlugin/manifest'
import { useLanguageSettings } from './useLanguageSettings'

/**
 * 节点卡片标题（多语言，跟随界面语言变化）。
 *
 * 显示名由节点插件在自己 manifest.title 里声明；未配当前语言时由 resolveNodeTitle 兜底
 * （en → zh → 已配的第一种 → 节点 type），所以只配了中英的插件在日语界面显示英文名。
 * 节点尚未就绪 / 已被删除时返回 fallback（沿用各卡片原来的 '?'）。
 *
 * 参数可以给节点取值函数，也可以直接给静态 type：
 * - 依赖节点实例的头部用 `useNodeTitle(() => inputNode.value, '?')`；
 * - 头部文案是固定节点名的卡片用 `useNodeTitle(ImageCropNode.TYPE)`，
 *   这样即使实例一时取不到，标题也照样显示。
 */
export function useNodeTitle(
  source: string | (() => Node | null | undefined),
  fallback = ''
): ComputedRef<string> {
  const { language } = useLanguageSettings()
  return computed(() => {
    const type = typeof source === 'function' ? source()?.type : source
    const manifest = type ? getNodeManifest(type) : undefined
    return manifest ? resolveNodeTitle(manifest, language.value) : fallback
  })
}