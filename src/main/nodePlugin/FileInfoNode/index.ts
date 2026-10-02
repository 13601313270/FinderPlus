import type { NodePluginManifest } from '../manifest'
import { FileInfoNode } from './node'
import render from './render.vue'

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
  iconPaths: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5Z', 'M14 2v5h5', 'M12 17h.01', 'M12 11v3'],
  category: 'input',
  help: () => import('./FileInfoHelpDialog.vue')
}

export default manifest
