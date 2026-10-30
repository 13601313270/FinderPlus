import type { NodePluginManifest } from '../manifest'
import { AudioTrimNode } from './node'
import render from './render.vue'

import AudioTrimIcon from '@renderer/assets/node-icons/AudioTrimNode.svg'

export const manifest: NodePluginManifest = {
  type: AudioTrimNode.TYPE,
  nodeClass: AudioTrimNode,
  title: {
    zh: '音频截取',
    en: 'Audio Trim'
  },
  // 图标：剪刀（截取音频片段）
  iconImage: AudioTrimIcon,
  category: 'tool',
  render,
  platforms: ["mac"]
}

export default manifest