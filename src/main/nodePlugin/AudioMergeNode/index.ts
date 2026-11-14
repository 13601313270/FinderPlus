import type { NodePluginManifest } from '../manifest'
import { AudioMergeNode } from './node'
import render from './render.vue'

import AudioMergeIcon from '@renderer/assets/node-icons/AudioMergeNode.svg'

export const manifest: NodePluginManifest = {
  type: AudioMergeNode.TYPE,
  nodeClass: AudioMergeNode,
  title: {
    zh: '音频拼接',
    en: 'Audio Merge'
  },
  iconImage: AudioMergeIcon,
  category: 'tool',
  render,
  platforms: ['mac']
}

export default manifest
