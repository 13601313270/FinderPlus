import type { NodePluginManifest } from '../manifest'
import { RecorderNode } from './node'
import render from './render.vue'

import RecorderIcon from '@renderer/assets/node-icons/RecorderNode.svg'

export const manifest: NodePluginManifest = {
  type: RecorderNode.TYPE,
  nodeClass: RecorderNode,
  title: {
    zh: '录音',
    en: 'Audio Recorder',
    ja: '音声録音',
    ko: '음성 녹음',
    es: 'Grabadora de audio',
    ar: 'مسجل صوت',
    fr: 'Enregistreur audio',
    pt: 'Gravador de áudio',
    ru: 'Аудиозаписывающее устройство',
    hi: 'ऑडियो रिकॉर्डर',
    id: 'Perekam Audio',
    de: 'Audio-Aufnahme',
    vi: 'Máy ghi âm',
    tr: 'Ses kaydedici',
    it: 'Registratore audio'
  },
  // 图标：麦克风（纯前端录音，和 TTSNode 的喇叭区分）
  iconImage: RecorderIcon,
  category: 'input',
  render,
  platforms: ["mac"]
}

export default manifest
