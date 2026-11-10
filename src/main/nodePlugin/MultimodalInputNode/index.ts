import type { NodePluginManifest } from '../manifest'
import { MultimodalInputNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: MultimodalInputNode.TYPE,
  nodeClass: MultimodalInputNode,
  title: {
    zh: '多模态输入',
    en: 'Multimodal Input',
    ja: '多模态入力',
    ko: '다중 모달 입력',
    es: 'Entrada multimodal',
    ar: 'إدخال متعدد الوسائط',
    fr: 'Entrée multimodale',
    pt: 'Entrada multimodal',
    ru: 'Мультимодальный ввод',
    hi: 'मल्टीमोडल इनपुट',
    id: 'Masukan multimodal',
    de: 'Multimodale Eingabe',
    vi: 'Đầu nhập đa phương thức',
    tr: 'Çok modlu giriş',
    it: 'Input multimodale'
  },
  render,
  category: 'input',
  platforms: ['mac']
}

export default manifest
