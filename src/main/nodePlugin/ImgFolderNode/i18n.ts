import type { LocalizedText } from '../../../shared/language'

/**
 * ImgFolder 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；只配了 zh / en，其他语言由
 * useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  imageCount: {
    zh: '{n} 张图片',
    en: '{n} images'
  },
  selected: {
    zh: '已选 {name}',
    en: 'Selected: {name}'
  },
  resizeHint: {
    zh: '拖动调整文件夹大小（最小 2×2）',
    en: 'Drag to resize the folder (min 2×2)'
  },
  helpTitle: {
    zh: '使用说明',
    en: 'Help',
    ja: 'ヘルプ',
    ko: '도움말',
    es: 'Ayuda',
    ar: 'مساعدة',
    fr: 'Aide',
    pt: 'Ajuda',
    ru: 'Справка'
  },
  helpDialogTitle: {
    zh: '图片文件夹节点使用说明',
    en: 'Image Folder node help',
    ja: '画像フォルダノードの使い方',
    ko: '이미지 폴더 노드 사용 설명',
    es: 'Ayuda del nodo Carpeta de imágenes',
    ar: 'مساعدة عقدة مجلد الصور',
    fr: 'Aide du nœud Dossier d’images',
    pt: 'Ajuda do nó Pasta de imagens',
    ru: 'Справка по узлу «Папка изображений»'
  }
} satisfies Record<string, LocalizedText>