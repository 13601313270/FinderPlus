import type { NodePluginManifest } from '../manifest'
import { JsonFileNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: JsonFileNode.TYPE,
  nodeClass: JsonFileNode,
  title: {
    zh: 'JSON文件',
    en: 'JSON file',
    ja: 'JSONファイル',
    ko: 'JSON 파일',
    es: 'Archivo JSON',
    ar: 'ملف JSON',
    fr: 'Fichier JSON',
    pt: 'Ficheiro JSON',
    ru: 'JSON-файл',
    hi: 'JSON फ़ाइल',
    id: 'Berkas JSON',
    de: 'JSON-Datei',
    vi: 'Tệp JSON',
    tr: 'JSON dosyası',
    it: 'File JSON'
  },
  iconImage: undefined, // JSON 节点用内联 SVG，暂无独立图标文件
  category: 'file',
  render,
  help: () => import('./JsonFileHelpDialog.vue'),
  platforms: ["mac"]
}

export default manifest
