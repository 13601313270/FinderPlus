import type { NodePluginManifest } from '../manifest'
import { StringConcatNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: StringConcatNode.TYPE,
  nodeClass: StringConcatNode,
  title: { zh: '字符串拼接', en: 'String Concat' },
  render
}

export default manifest
