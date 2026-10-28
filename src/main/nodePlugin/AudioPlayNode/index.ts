import type { NodePluginManifest } from '../manifest'
import { AudioPlayNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: AudioPlayNode.TYPE,
  nodeClass: AudioPlayNode,
  title: {
    zh: '音频播放',
    en: 'Audio Player',
    ja: '音声再生',
    ko: '오디오 플레이어',
    es: 'Reproductor de audio',
    ar: 'مشغل الصوت',
    fr: 'Lecteur audio',
    pt: 'Leitor de áudio',
    ru: 'Аудиоплеер',
    hi: 'ऑडियो प्लेयर',
    id: 'Pemutar Audio',
    de: 'Audio-Player',
    vi: 'Trình phát âm thanh',
    tr: 'Ses Oynatıcı',
    it: 'Lettore audio'
  },
  // 喇叭图标（和 AudioFileNode 一致，区分开文件类型节点）
  iconPaths: ['M3 10v4h4l5 4V6L7 10H3Z', 'M16 8a4 4 0 0 1 0 8'],
  category: 'tool',
  render,
  platforms: ["mac"]
}

export default manifest
