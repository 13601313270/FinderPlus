import type { NodePluginManifest } from '../manifest'
import { AudioSpeedNode } from './node'
import render from './render.vue'

import AudioSpeedIcon from '@renderer/assets/node-icons/AudioSpeedNode.svg'

export const manifest: NodePluginManifest = {
  type: AudioSpeedNode.TYPE,
  nodeClass: AudioSpeedNode,
  title: {
    zh: '音频速度控制',
    en: 'Audio Speed',
    ja: '音声速度',
    ko: '오디오 속도',
    es: 'Velocidad de audio',
    ar: 'سرعة الصوت',
    fr: 'Vitesse audio',
    pt: 'Velocidade de áudio',
    ru: 'Скорость аудио',
    hi: 'ऑडियो गति',
    id: 'Kecepatan Audio',
    de: 'Audio-Geschwindigkeit',
    vi: 'Tốc độ âm thanh',
    tr: 'Ses hızı',
    it: 'Velocità audio'
  },
  // 图标：仪表盘指针（速度调节）
  iconImage: AudioSpeedIcon,
  common: false,
  category: 'tool',
  render,
  platforms: ["mac"]
}

export default manifest
