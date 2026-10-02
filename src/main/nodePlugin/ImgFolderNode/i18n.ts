import type { LocalizedText } from '../../../shared/language'

/**
 * ImgFolder 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  imageCount: {
    zh: '{n} 张图片',
    en: '{n} images',
    ja: '{n} 枚の画像',
    ko: '이미지 {n}장',
    es: '{n} imágenes',
    ar: '{n} صورة',
    fr: '{n} images',
    pt: '{n} imagens',
    ru: '{n} изображений',
    hi: '{n} छवियाँ',
    id: '{n} gambar',
    de: '{n} Bilder',
    vi: '{n} ảnh',
    tr: '{n} görüntü',
    it: '{n} immagini'
  },
  selected: {
    zh: '已选 {name}',
    en: 'Selected: {name}',
    ja: '選択中 {name}',
    ko: '선택됨 {name}',
    es: 'Seleccionado: {name}',
    ar: 'المحدد: {name}',
    fr: 'Sélectionné : {name}',
    pt: 'Selecionado: {name}',
    ru: 'Выбрано: {name}',
    hi: 'चयनित: {name}',
    id: 'Dipilih: {name}',
    de: 'Ausgewählt: {name}',
    vi: 'Đã chọn: {name}',
    tr: 'Seçili: {name}',
    it: 'Selezionato: {name}'
  },
  resizeHint: {
    zh: '拖动调整文件夹大小（最小 2×2）',
    en: 'Drag to resize the folder (min 2×2)',
    ja: 'ドラッグしてフォルダの大きさを変更（最小 2×2）',
    ko: '드래그하여 폴더 크기 조절 (최소 2×2)',
    es: 'Arrastra para cambiar el tamaño de la carpeta (mín. 2×2)',
    ar: 'اسحب لتغيير حجم المجلد (الحد الأدنى 2×2)',
    fr: 'Glissez pour redimensionner le dossier (min. 2×2)',
    pt: 'Arraste para redimensionar a pasta (mín. 2×2)',
    ru: 'Перетащите, чтобы изменить размер папки (минимум 2×2)',
    hi: 'फ़ोल्डर का आकार बदलने के लिए खींचें (न्यूनतम 2×2)',
    id: 'Seret untuk mengubah ukuran folder (min 2×2)',
    de: 'Ziehen, um die Ordnergröße zu ändern (min. 2×2)',
    vi: 'Kéo để thay đổi kích thước thư mục (tối thiểu 2×2)',
    tr: 'Klasör boyutunu değiştirmek için sürükleyin (en az 2×2)',
    it: 'Trascina per ridimensionare la cartella (min 2×2)'
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
    ru: 'Справка',
    hi: 'सहायता',
    id: 'Bantuan',
    de: 'Hilfe',
    vi: 'Trợ giúp',
    tr: 'Yardım',
    it: 'Guida'
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
    ru: 'Справка по узлу «Папка изображений»',
    hi: 'छवि फ़ोल्डर नोड सहायता',
    id: 'Bantuan node Folder Gambar',
    de: 'Hilfe zum Knoten „Bildordner“',
    vi: 'Trợ giúp nút Thư mục ảnh',
    tr: 'Görüntü Klasörü düğümü yardımı',
    it: 'Guida al nodo Cartella immagini'
  }
} satisfies Record<string, LocalizedText>