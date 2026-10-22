import type { NodePluginManifest } from '../manifest'
import { VideoFileNode } from './node'
import render from './render.vue'

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
  iconPaths: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M10 8l6 4-6 4z'],
  category: 'file',
  render
}

export default manifest
