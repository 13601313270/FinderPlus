import type { LocalizedText } from '../../../shared/language'

/** 端口标签（引擎构造端口时用；栈 / 队列共用） */
export const inLabel: LocalizedText = {
  zh: '入',
  en: 'In',
  ja: '入力',
  ko: '입력',
  es: 'Entrada',
  ar: 'إدخال',
  fr: 'Entrée',
  pt: 'Entrada',
  ru: 'Ввод',
  hi: 'इनपुट',
  id: 'Masukan',
  de: 'Eingabe',
  vi: 'Vào',
  tr: 'Giriş',
  it: 'Ingresso'
}

/** 端口标签（引擎构造端口时用；栈 / 队列共用） */
export const outLabel: LocalizedText = {
  zh: '出',
  en: 'Out',
  ja: '出力',
  ko: '출력',
  es: 'Salida',
  ar: 'إخراج',
  fr: 'Sortie',
  pt: 'Saída',
  ru: 'Вывод',
  hi: 'आउटपुट',
  id: 'Keluaran',
  de: 'Ausgabe',
  vi: 'Ra',
  tr: 'Çıkış',
  it: 'Uscita'
}

/**
 * 栈 / 队列节点卡片内的全部文案（两个节点共用一份，避免整表重复）。
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
    it: 'Trascina il nodo',
  },
  typeLabel: {
    zh: '数据类型',
    en: 'Data type',
    ja: 'データ型',
    ko: '데이터 유형',
    es: 'Tipo de dato',
    ar: 'نوع البيانات',
    fr: 'Type de donnée',
    pt: 'Tipo de dado',
    ru: 'Тип данных',
    hi: 'डेटा प्रकार',
    id: 'Jenis data',
    de: 'Datentyp',
    vi: 'Kiểu dữ liệu',
    tr: 'Veri türü',
    it: 'Tipo di dato',
  },
  countLabel: {
    zh: '已进入',
    en: 'Stored',
    ja: '格納数',
    ko: '저장됨',
    es: 'Almacenados',
    ar: 'المخزّن',
    fr: 'Stockés',
    pt: 'Armazenados',
    ru: 'В буфере',
    hi: 'संग्रहीत',
    id: 'Tersimpan',
    de: 'Gespeichert',
    vi: 'Đã lưu',
    tr: 'Depolanan',
    it: 'Memorizzati',
  },
  take: {
    zh: '出',
    en: 'Out',
    ja: '取り出し',
    ko: '꺼내기',
    es: 'Sacar',
    ar: 'إخراج',
    fr: 'Sortir',
    pt: 'Retirar',
    ru: 'Извлечь',
    hi: 'निकालें',
    id: 'Keluarkan',
    de: 'Entnehmen',
    vi: 'Lấy ra',
    tr: 'Çıkar',
    it: 'Estrai'
  },
  helpTitle: {
    zh: '帮助',
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
    it: 'Aiuto'
  },
  helpDialogTitle: {
    zh: '缓冲区节点使用说明',
    en: 'Buffer node guide',
    ja: 'バッファノードの使い方',
    ko: '버퍼 노드 사용 안내',
    es: 'Guía del nodo Búfer',
    ar: 'دليل عقدة المخزن المؤقت',
    fr: 'Guide du nœud Tampon',
    pt: 'Guia do nó Buffer',
    ru: 'Руководство по узлу «Буфер»',
    hi: 'बफ़र नोड मार्गदर्शिका',
    id: 'Panduan node Buffer',
    de: 'Anleitung zum Puffer-Knoten',
    vi: 'Hướng dẫn nút Bộ đệm',
    tr: 'Arabellek düğümü kılavuzu',
    it: 'Guida del nodo Buffer'
  }
} satisfies Record<string, LocalizedText>