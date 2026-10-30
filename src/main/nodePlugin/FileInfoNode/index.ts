import type { NodePluginManifest } from '../manifest'
import { FileInfoNode } from './node'
import render from './render.vue'

import FileInfoIcon from '@renderer/assets/node-icons/FileInfoNode.svg'

export const manifest: NodePluginManifest = {
  type: FileInfoNode.TYPE,
  nodeClass: FileInfoNode,
  title: {
    zh: '文件信息',
    en: 'File Info',
    ja: 'ファイル情報',
    ko: '파일 정보',
    es: 'Información de archivo',
    ar: 'معلومات الملف',
    fr: 'Informations de fichier',
    pt: 'Informações do arquivo',
    ru: 'Информация о файле',
    hi: 'फ़ाइल जानकारी',
    id: 'Informasi berkas',
    de: 'Dateiinfo',
    vi: 'Thông tin tệp',
    tr: 'Dosya bilgisi',
    it: 'Informazioni file'
  },
  render,
  iconImage: FileInfoIcon,
  category: 'text-data',
  help: () => import('./FileInfoHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
