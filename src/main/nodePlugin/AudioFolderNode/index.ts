import type { NodePluginManifest } from '../manifest'
import { AudioFolderNode } from './node'
import render from './render.vue'

import AudioFolderIcon from '@renderer/assets/node-icons/AudioFolderNode.svg'

export const manifest: NodePluginManifest = {
  type: AudioFolderNode.TYPE,
  nodeClass: AudioFolderNode,
  title: {
    zh: '音频文件夹',
    en: 'Audio Folder',
    ja: '音声フォルダ',
    ko: '오디오 폴더',
    es: 'Carpeta de audio',
    ar: 'مجلد الصوت',
    fr: 'Dossier audio',
    pt: 'Pasta de áudio',
    ru: 'Папка аудио',
    hi: 'ऑडियो फ़ोल्डर',
    id: 'Folder Audio',
    de: 'Audioordner',
    vi: 'Thư mục âm thanh',
    tr: 'Ses Klasörü',
    it: 'Cartella audio'
  },
  render,
  iconImage: AudioFolderIcon,
  category: 'audio',
  help: () => import('./AudioFolderHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
