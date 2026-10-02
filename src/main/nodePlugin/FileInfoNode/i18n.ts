import type { LocalizedText } from '../../../shared/language'

/**
 * FileInfo 节点卡片内的全部文案。
 *
 * 放在节点自己的文件夹里，跟随节点一起搬运；已覆盖 LANGUAGE_CODES 的全部语言，
 * 若将来新增语言码未补齐，仍由 useLocalizedMessages → resolveLocalizedText 兜底到英语。
 */
export const messages = {
  dragHint: {
    zh: '拖动节点',
    en: 'Drag node',
    ja: 'ノードをドラッグ',
    ko: '노드 드래그',
    es: 'Arrastrar nodo',
    ar: 'اسحب العقدة',
    fr: 'Glisser le nœud',
    pt: 'Arrastar nó',
    ru: 'Перетащить узел',
    hi: 'नोड खींचें',
    id: 'Seret node',
    de: 'Knoten ziehen',
    vi: 'Kéo nút',
    tr: 'Düğümü sürükle',
    it: 'Trascina nodo'
  },
  labelName: {
    zh: '名称',
    en: 'Name',
    ja: '名前',
    ko: '이름',
    es: 'Nombre',
    ar: 'الاسم',
    fr: 'Nom',
    pt: 'Nome',
    ru: 'Имя',
    hi: 'नाम',
    id: 'Nama',
    de: 'Name',
    vi: 'Tên',
    tr: 'Ad',
    it: 'Nome'
  },
  labelSize: {
    zh: '大小',
    en: 'Size',
    ja: 'サイズ',
    ko: '크기',
    es: 'Tamaño',
    ar: 'الحجم',
    fr: 'Taille',
    pt: 'Tamanho',
    ru: 'Размер',
    hi: 'आकार',
    id: 'Ukuran',
    de: 'Größe',
    vi: 'Kích thước',
    tr: 'Boyut',
    it: 'Dimensione'
  },
  labelType: {
    zh: '类型',
    en: 'Type',
    ja: 'タイプ',
    ko: '유형',
    es: 'Tipo',
    ar: 'النوع',
    fr: 'Type',
    pt: 'Tipo',
    ru: 'Тип',
    hi: 'प्रकार',
    id: 'Jenis',
    de: 'Typ',
    vi: 'Loại',
    tr: 'Tür',
    it: 'Tipo'
  },
  empty: {
    zh: '（暂无输入）',
    en: '(No input)',
    ja: '（入力なし）',
    ko: '(입력 없음)',
    es: '(Sin entrada)',
    ar: '(لا يوجد إدخال)',
    fr: '(Aucune entrée)',
    pt: '(Sem entrada)',
    ru: '(Нет входа)',
    hi: '（कोई इनपुट नहीं）',
    id: '（Tidak ada masukan）',
    de: '（Keine Eingabe）',
    vi: '（Không có đầu vào）',
    tr: '（Giriş yok）',
    it: '（Nessun input）'
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
    zh: '文件信息节点使用说明',
    en: 'File Info node help',
    ja: 'ファイル情報ノードの使い方',
    ko: '파일 정보 노드 사용 방법',
    es: 'Ayuda del nodo Información de archivo',
    ar: 'مساعدة عقدة معلومات الملف',
    fr: 'Aide du nœud Informations de fichier',
    pt: 'Ajuda do nó Informações do arquivo',
    ru: 'Справка по узлу «Информация о файле»',
    hi: 'फ़ाइल सूचना नोड सहायता',
    id: 'Bantuan node Informasi berkas',
    de: 'Hilfe zum Knoten „Dateiinfo“',
    vi: 'Trợ giúp nút Thông tin tệp',
    tr: 'Dosya bilgisi düğümü yardımı',
    it: 'Guida del nodo Informazioni file'
  }
} satisfies Record<string, LocalizedText>