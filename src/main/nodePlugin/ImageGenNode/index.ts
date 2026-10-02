import type { NodePluginManifest } from '../manifest'
import { ImageGenNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImageGenNode.TYPE,
  nodeClass: ImageGenNode,
  title: {
    zh: '文生图',
    en: 'Text to Image',
    ja: 'テキストから画像生成',
    ko: '텍스트로 이미지 생성',
    es: 'Texto a imagen',
    ar: 'من النص إلى الصورة',
    fr: 'Texte vers image',
    pt: 'Texto para imagem',
    ru: 'Текст в изображение',
    hi: 'पाठ से छवि',
    id: 'Teks ke gambar',
    de: 'Text zu Bild',
    vi: 'Văn bản thành hình ảnh',
    tr: 'Metinden görüntüye',
    it: 'Testo a immagine'
  },
  render,
  iconPaths: ['M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z', 'M18 15v4', 'M16 17h4'],
  category: 'ai',
  help: () => import('./ImageGenHelpDialog.vue')
}

export default manifest
