import type { NodePluginManifest } from '../manifest'
import { VideoFileNode } from './node'
import render from './render.vue'

import VideoFileIcon from '@renderer/assets/node-icons/VideoFileNode.svg'

export const manifest: NodePluginManifest = {
  type: VideoFileNode.TYPE,
  nodeClass: VideoFileNode,
  title: {
    zh: '视频文件',
    en: 'Video file',
    ja: '動画ファイル',
    ko: '비디오 파일',
    es: 'Archivo de video',
    ar: 'ملف فيديو',
    fr: 'Fichier vidéo',
    pt: 'Ficheiro de vídeo',
    ru: 'Видеофайл',
    hi: 'वीडियो फ़ाइल',
    id: 'Berkas video',
    de: 'Videodatei',
    vi: 'Tệp video',
    tr: 'Video dosyası',
    it: 'File video'
  },
  // 图标：播放 / 暂停 两笔（与音频节点的喇叭形区分开）
  iconImage: VideoFileIcon,
  category: 'file',
  render,
  platforms: ["mac"]
}

export default manifest
