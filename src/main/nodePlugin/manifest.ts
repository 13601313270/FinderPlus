import type { Component } from 'vue'
import type { Node } from '../engine/node/Node'
import type { LanguageCode, LocalizedText } from '../../shared/language'

/**
 * 节点显示名的多语言表。
 *
 * 刻意用 Partial：**不强制**插件配齐所有语言，插件只配自己有把握的即可
 * （比如只配 zh + en 两个 title），其余语言交给 resolveNodeTitle 兜底。
 *
 * key 受 LanguageCode 约束（定义在 shared/language.ts，主/渲染两侧共用），
 * 写错语言代码（比如 'jp'）编译期就会报错。
 *
 * 之所以把显示名放在插件自己身上、而不是塞进渲染进程的 locales 词条：
 * 插件是可插拔的——第三方插件不该为了显示一个名字去改 Finder+ 的中央词条表。
 */
export type NodeTitle = LocalizedText

/**
 * 节点插件清单：把「节点类」和「渲染组件」钉死在同一份声明里。
 * 使用方只能从注册表按节点 type 取 manifest，用 nodeClass 构造、用 render 渲染，
 * 从结构上杜绝「把 text-input 配到展示节点组件上」这类错绑。
 */
export interface NodePluginManifest {
  /** 节点的类型标识，取节点自身的 type 值（单一真相源，如 'text-input'） */
  readonly type: string
  /** 构造引擎节点的类 */
  readonly nodeClass: new (id: string) => Node
  /** 该节点的渲染组件 */
  readonly render: Component
  /**
   * 节点的显示名（多语言，可选）。可只配若干语言，未配的语言按 resolveNodeTitle 兜底。
   * 不配时画布上退回展示 type（与加入本字段之前的行为一致）。
   */
  readonly title?: NodeTitle
  /**
   * 调色板图标（可选）：24×24 视图盒内的一组 SVG path 的 d 字符串，
   * 由渲染方统一以描边风格（stroke=currentColor）绘制，因此不写死颜色、自动跟随主题。
   *
   * 与 title 同理，图标由插件自己声明，第三方插件不必去改渲染进程的中央图标表。
   * 不配时调色板项只显示文字（与加入本字段之前的行为一致）。
   */
  readonly iconPaths?: readonly string[]
  /**
   * 帮助文档组件（可选）。
   * 异步加载函数形式，如 `help: () => import('./CodeHelpDialog.vue')`。
   * 点击节点上的帮助按钮时会 resolve 这个函数，把默认导出的组件嵌进 HelpDialog 弹窗。
   */
  readonly help?: () => Promise<{ default: Component }>
}

/**
 * 解析节点显示名。
 *
 * 兜底顺序：目标语言 → 英语 → 中文 → 表里第一个配了的语言 → 节点 type。
 * 于是只配了 zh/en 的插件，在日语界面会显示英文名，而不是裸的 type 字符串；
 * 一个 title 都没配的插件（例如尚未适配的老插件）退回 type，行为与之前完全一致。
 */
export function resolveNodeTitle(manifest: NodePluginManifest, locale: LanguageCode): string {
  const title = manifest.title
  if (title) {
    const hit = title[locale] ?? title.en ?? title.zh ?? Object.values(title)[0]
    if (hit) return hit
  }
  return manifest.type
}