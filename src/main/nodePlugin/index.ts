import type { Node } from '../engine/node/Node'
import type { NodePluginManifest } from './manifest'
import { FileNode } from './FileNode/node'
import { manifest as textInputManifest } from './TextInputNode'
import { manifest as textDisplayManifest } from './TextDisplayNode'
import { manifest as numberInputManifest } from './NumberInputNode'
import { manifest as boolInputManifest } from './BoolInputNode'
import { manifest as txtFileManifest } from './TxtFileNode'
import { manifest as imgFileManifest } from './ImgFileNode'
import { manifest as anyFileManifest } from './AnyFileNode'
import { manifest as fileInfoManifest } from './FileInfoNode'
import { manifest as imagePreviewManifest } from './ImagePreviewNode'
import { manifest as imageCompressManifest } from './ImageCompressNode'
import { manifest as folderManifest } from './FolderNode'
import { manifest as imgFolderManifest } from './ImgFolderNode'
import { manifest as llmManifest } from './LLMNode'
import { manifest as imageGenManifest } from './ImageGenNode'
import { manifest as humanReviewManifest } from './HumanReviewNode'
import { manifest as stringConcatManifest } from './StringConcatNode'
import { manifest as commandManifest } from './CommandNode'
import { manifest as codeManifest } from './CodeNode'
import { manifest as backgroundRemoveManifest } from './BackgroundRemoveNode'

/**
 * 插件注册表：所有节点插件的 manifest 汇总。
 *
 * 使用方只认这里的 type -> manifest 映射，不再自己 import 具体 node.ts / render.vue，
 * 「节点类 ↔ 渲染组件」的配对由各插件 index.ts 声明、这里统一收口。
 *
 * 数组顺序很重要：resolveByExtension 单遍扫描，先命中先返回。
 * 所以拆成三组 merge：功能节点 → 具体文件节点 → 兜底文件节点。
 * 多个兜底节点之间按 anyFileGroup 内声明顺序决定优先级。
 */
const functionalManifests: NodePluginManifest[] = [
  textInputManifest,
  textDisplayManifest,
  numberInputManifest,
  boolInputManifest,
  fileInfoManifest,
  imagePreviewManifest,
  imageCompressManifest,
  backgroundRemoveManifest,
  folderManifest,
  imgFolderManifest,
  llmManifest,
  imageGenManifest,
  humanReviewManifest,
  stringConcatManifest,
  commandManifest,
  codeManifest
]

const fileManifests: NodePluginManifest[] = [
  txtFileManifest,
  imgFileManifest
]

const fallbackManifests: NodePluginManifest[] = [
  anyFileManifest
]

export const nodeManifests: readonly NodePluginManifest[] = [
  ...functionalManifests,
  ...fileManifests,
  ...fallbackManifests
]

/**
 * 调色板专用列表：只列出功能节点，不含文件类型节点。
 * 文件类型节点（txt-file、img-file、any-file）通过外部拖入创建，
 * 不在左上角「＋」菜单中展示。
 */
export const paletteManifests: readonly NodePluginManifest[] = functionalManifests

const byType = new Map<string, NodePluginManifest>(nodeManifests.map((m) => [m.type, m]))

/** 按节点 type 取 manifest；未知类型返回 undefined */
export function getNodeManifest(type: string): NodePluginManifest | undefined {
  return byType.get(type)
}

/** 按节点实例取 manifest（包装 getNodeManifest，少一个 extraneous 参数） */
export function manifestFor(node: Node): NodePluginManifest | undefined {
  return byType.get(node.type)
}

/**
 * 根据文件后缀反查承接该后缀的 FileNode 子类 manifest。
 *
 * 用于拖拽分发：App.vue 拖入文件后，拿到后缀（如 'txt'），
 * 用这个函数找到 TxtFileNode 的 manifest，然后构造节点、走跟随/放置流程。
 *
 * 匹配逻辑：大小写不敏感；后缀带不带点都能识别（传 'txt' 或 '.txt' 都行）。
 * 单遍扫描 nodeManifests 数组，先命中先返回——数组顺序（功能节点 →
 * 具体文件节点 → 兜底文件节点）天然保证兜底排在最后。
 */
export function resolveByExtension(ext: string): NodePluginManifest | undefined {
  // 归一化：小写 + 确保以点开头
  const normalized = ext.toLowerCase().startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`

  for (const manifest of nodeManifests) {
    const cls = manifest.nodeClass
    if (!(cls.prototype instanceof FileNode)) continue
    const fileCls = cls as unknown as typeof FileNode
    if (fileCls.acceptsExtension(normalized)) {
      return manifest
    }
  }
  return undefined
}