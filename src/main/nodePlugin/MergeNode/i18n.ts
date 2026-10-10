import type { LocalizedText } from '../../../shared/language'

/** 端口标签（引擎构造端口时用）—— 复用 BufferNode 同形态 */
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

/** 卡片内文案 */
export const messages = {
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
  portsLabel: {
    zh: '个输入',
    en: 'inputs',
    ja: '入力',
    ko: '입력',
    es: 'entradas',
    ar: 'مداخل',
    fr: 'entrées',
    pt: 'entradas',
    ru: 'входов',
    hi: 'इनपुट',
    id: 'input',
    de: 'Eingänge',
    vi: 'đầu vào',
    tr: 'giriş',
    it: 'ingressi',
  },
} satisfies Record<string, LocalizedText>
