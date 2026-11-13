import type { LocalizedText } from '../../../shared/language'

/**
 * AudioFolder 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  audioCount: {
    zh: '{n} 个音频',
    en: '{n} audio files',
    ja: '{n} 個の音声',
    ko: '오디오 {n}개',
    es: '{n} archivos de audio',
    ar: '{n} ملف صوتي',
    fr: '{n} fichiers audio',
    pt: '{n} arquivos de áudio',
    ru: '{n} аудиофайлов',
    hi: '{n} ऑडियो फ़ाइलें',
    id: '{n} berkas audio',
    de: '{n} Audiodateien',
    vi: '{n} tệp âm thanh',
    tr: '{n} ses dosyası',
    it: '{n} file audio'
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
    zh: '拖动调整文件夹大小',
    en: 'Drag to resize the folder',
    ja: 'ドラッグしてフォルダの大きさを変更',
    ko: '드래그하여 폴더 크기 조절',
    es: 'Arrastra para cambiar el tamaño de la carpeta',
    ar: 'اسحب لتغيير حجم المجلد',
    fr: 'Glissez pour redimensionner le dossier',
    pt: 'Arraste para redimensionar a pasta',
    ru: 'Перетащите, чтобы изменить размер папки',
    hi: 'फ़ोल्डर का आकार बदलने के लिए खींचें',
    id: 'Seret untuk mengubah ukuran folder',
    de: 'Ziehen, um die Ordnergröße zu ändern',
    vi: 'Kéo để thay đổi kích thước thư mục',
    tr: 'Klasör boyutunu değiştirmek için sürükleyin',
    it: 'Trascina per ridimensionare la cartella'
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
    zh: '音频文件夹节点使用说明',
    en: 'Audio Folder node help',
    ja: '音声フォルダノードの使い方',
    ko: '오디오 폴더 노드 사용 설명',
    es: 'Ayuda del nodo Carpeta de audio',
    ar: 'مساعدة عقدة مجلد الصوت',
    fr: 'Aide du nœud Dossier audio',
    pt: 'Ajuda do nó Pasta de áudio',
    ru: 'Справка по узлу «Папка аудио»',
    hi: 'ऑडियो फ़ोल्डर नोड सहायता',
    id: 'Bantuan node Folder Audio',
    de: 'Hilfe zum Knoten „Audioordner“',
    vi: 'Trợ giúp nút Thư mục âm thanh',
    tr: 'Ses Klasörü düğümü yardımı',
    it: 'Guida al nodo Cartella audio'
  }
} satisfies Record<string, LocalizedText>
