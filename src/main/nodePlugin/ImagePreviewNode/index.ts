import type { NodePluginManifest } from '../manifest'
import { ImagePreviewNode } from './node'
import render from './render.vue'

export const manifest: NodePluginManifest = {
  type: ImagePreviewNode.TYPE,
  nodeClass: ImagePreviewNode,
  title: {
    zh: '图片预览',
    en: 'Image Preview',
    ja: '画像プレビュー',
    ko: '이미지 미리보기',
    es: 'Vista previa de imagen',
    ar: 'معاينة الصورة',
    fr: 'Aperçu d’image',
    pt: 'Pré-visualizar imagem',
    ru: 'Предпросмотр изображения',
    hi: 'छवि पूर्वावलोकन',
    id: 'Pratinjau gambar',
    de: 'Bildvorschau',
    vi: 'Xem trước ảnh',
    tr: 'Görüntü önizlemesi',
    it: 'Anteprima immagine'
  },
  render,
  help: () => import('./ImagePreviewHelpDialog.vue')
}

export default manifest
