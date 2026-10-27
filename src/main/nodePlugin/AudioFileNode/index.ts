import type { NodePluginManifest } from '../manifest'
import { AudioFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: AudioFileNode.TYPE,
  nodeClass: AudioFileNode,
  title: {
    zh: '音频文件',
    en: 'Audio file',
    ja: '音声ファイル',
    ko: '오디오 파일',
    es: 'Archivo de audio',
    ar: 'ملف صوت',
    fr: 'Fichier audio',
    pt: 'Ficheiro de áudio',
    ru: 'Аудиофайл',
    hi: 'ऑडियो फ़ाइल',
    id: 'Berkas audio',
    de: 'Audiodatei',
    vi: 'Tệp âm thanh',
    tr: 'Ses dosyası',
    it: 'File audio'
  },
  // 图标：喇叭（和 TTS 一样的喇叭形，区分开图片/文本节点）
  iconPaths: ['M3 10v4h4l5 4V6L7 10H3Z', 'M16 8a4 4 0 0 1 0 8'],
  category: 'file',
  render,
  platforms: ["mac"]
}

export default manifest
