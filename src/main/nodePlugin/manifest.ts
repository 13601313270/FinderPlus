import type { Component } from 'vue'
import type { Node } from '../engine/node/Node'

/**
 * 节点插件清单：把「节点类」和「渲染组件」钉死在同一份声明里。
 *
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
   * 帮助文档组件（可选）。
   * 异步加载函数形式，如 `help: () => import('./CodeHelpDialog.vue')`。
   * 点击节点上的帮助按钮时会 resolve 这个函数，把默认导出的组件嵌进 HelpDialog 弹窗。
   */
  readonly help?: () => Promise<{ default: Component }>
}