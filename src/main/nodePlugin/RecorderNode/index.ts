import type { NodePluginManifest } from '../manifest'
import { RecorderNode } from './node'
import render from './render.vue'

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
  iconPaths: [
    'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z',
    'M5 10a7 7 0 0 0 14 0',
    'M12 19v3',
    'M8 22h8'
  ],
  category: 'input',
  render
}

export default manifest
