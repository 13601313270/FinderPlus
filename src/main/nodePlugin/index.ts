import type { Node } from '../engine/node/Node'
import type { NodePluginManifest } from './manifest'
import { manifest as textInputManifest } from './TextInputNode'
import { manifest as textDisplayManifest } from './TextDisplayNode'

/**
 * 插件注册表：所有节点插件的 manifest 汇总。
 *
 * 使用方只认这里的 type -> manifest 映射，不再自己 import 具体 node.ts / render.vue，
 * 「节点类 ↔ 渲染组件」的配对由各插件 index.ts 声明、这里统一收口。
 */
export const nodeManifests: readonly NodePluginManifest[] = [
  textInputManifest,
  textDisplayManifest
]

const byType = new Map<string, NodePluginManifest>(nodeManifests.map((m) => [m.type, m]))

/** 按节点 type 取 manifest；未知类型返回 undefined */
export function getNodeManifest(type: string): NodePluginManifest | undefined {
  return byType.get(type)
}

/** 按节点实例取 manifest（包装 getNodeManifest，少一个 extraneous 参数） */
export function manifestFor(node: Node): NodePluginManifest | undefined {
  return byType.get(node.type)
}