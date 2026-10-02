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
  iconPaths: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M9 9m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0', 'm21 15-5-5-11 11'],
  category: 'image',
  help: () => import('./ImagePreviewHelpDialog.vue')
}

export default manifest
