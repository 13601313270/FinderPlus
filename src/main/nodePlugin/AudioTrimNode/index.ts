import type { NodePluginManifest } from '../manifest'
import { AudioTrimNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: AudioTrimNode.TYPE,
  nodeClass: AudioTrimNode,
  title: {
    zh: '音频截取',
    en: 'Audio Trim'
  },
  // 图标：剪刀（截取音频片段）
  iconPaths: [
    'M3 6a3 3 0 1 0 6 0 3 3 0 0 0-6 0z',
    'M8.12 8.12 12 12',
    'M20 4 8.12 15.88',
    'M3 18a3 3 0 1 0 6 0 3 3 0 0 0-6 0z',
    'M14.8 14.8 20 20'
  ],
  category: 'tool',
  render,
  platforms: ["mac"]
}

export default manifest