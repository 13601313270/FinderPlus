import type { NodePluginManifest } from '../manifest'
import { AudioSpeedNode } from './node'
import render from './render.vue'

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
  iconPaths: [
    'M12 3a9 9 0 1 0 9 9',
    'M12 12l6-4'
  ],
  common: false,
  category: 'tool',
  render,
  platforms: ["mac"]
}

export default manifest
